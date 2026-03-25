import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';
import { getRoleRank } from '../middleware/auth.middleware';

/**
 * Leave Statuses (V3):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED, 
 * MANAGER_REVIEW, MANAGER_APPROVED, MANAGER_REJECTED, 
 * HR_REVIEW, APPROVED, HR_REJECTED, CANCELLED
 */

export class LeaveService {
  /**
   * Request leave. 
   * Moves to SUBMITTED if reliever is specified, or direct to MANAGER_REVIEW if none.
   */
  static async requestLeave(organizationId: string, employeeId: string, data: any) {
    const { startDate, endDate, reason, relieverId, leaveType } = data;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const leaveDays = this.calculateWorkingDays(start, end);

    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user) throw new Error('User not found');
    
    // Balance check
    if ((user.leaveBalance || 0) < leaveDays) {
      throw new Error(`Insufficient leave balance. Needed ${leaveDays}, has ${user.leaveBalance}`);
    }

    const initialStatus = relieverId ? 'SUBMITTED' : 'MANAGER_REVIEW';

    const leave = await prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId,
        startDate: start,
        endDate: end,
        leaveDays,
        reason,
        relieverId: relieverId || null,
        status: initialStatus
      }
    });

    if (relieverId) {
      await notify(relieverId, '🤝 Handover Request', `${user.fullName} has requested you as a reliever for leave.`, 'INFO', '/leave');
    } else if (user.supervisorId) {
      await notify(user.supervisorId, '📅 New Leave Request', `${user.fullName} has requested leave.`, 'INFO', '/team/leave');
    }

    return leave;
  }

  /**
   * Reliever accepts or declines
   */
  static async respondAsReliever(leaveId: string, relieverId: string, accept: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new Error('Leave request not found');
    if (leave.relieverId !== relieverId) throw new Error('Not authorized to respond as reliever');
    if (leave.status !== 'SUBMITTED') throw new Error('Leave is not in SUBMITTED state');

    const nextStatus = accept ? 'RELIEVER_ACCEPTED' : 'RELIEVER_DECLINED';
    
    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        relieverStatus: accept ? 'ACCEPTED' : 'DECLINED',
        relieverComment: comment,
        relieverRespondedAt: new Date(),
        status: nextStatus
      }
    });

    // Notify employee
    await notify(leave.employeeId, 
      accept ? '✅ Reliever Accepted' : '❌ Reliever Declined',
      `${leave.relieverId} has ${accept ? 'accepted' : 'declined'} your reliever request.`,
      accept ? 'SUCCESS' : 'WARNING',
      '/leave'
    );

    // If accepted, auto-advance to Manager Review
    if (accept) {
       await prisma.leaveRequest.update({
         where: { id: leaveId },
         data: { status: 'MANAGER_REVIEW' }
       });
       
       if (leave.employee.supervisorId) {
         await notify(leave.employee.supervisorId, '📝 Leave Pending Manager Review', `${leave.employee.fullName}'s leave is now ready for your review.`, 'INFO', '/team/leave');
       }
    }

    return updated;
  }

  static async managerReview(leaveId: string, managerId: string, approve: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'MANAGER_REVIEW' && leave.status !== 'RELIEVER_ACCEPTED' && leave.status !== 'SUBMITTED') {
      throw new Error(`Invalid stage: Leave is currently in ${leave.status} status.`);
    }

    const actor = await prisma.user.findUnique({ where: { id: managerId } });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);

    // Step 1: Manager Review logic:
    // 1. Primary Manager (supervisorId)
    // 2. Any Manager (Rank >= 70) in the SAME department
    // 3. Any high-rank (Rank >= 75) or HR override
    const isPrimaryManager = leave.employee.supervisorId === managerId;
    const isDeptManager = actor.departmentId === leave.employee.departmentId && rank >= 70;
    const isHighRank = rank >= 75; // HR (75), Director (80), MD (90)

    if (!isPrimaryManager && !isDeptManager && !isHighRank) {
      throw new Error('Unauthorized for Step 1 Manager Review. You must be the direct supervisor, a manager in the same department, or an administrator.');
    }

    const nextStatus = approve ? 'HR_REVIEW' : 'MANAGER_REJECTED';

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: nextStatus as any,
        managerComment: comment,
        managerId: managerId
      }
    });

    await notify(leave.employeeId, 
      approve ? '📋 Manager Approved' : '❌ Manager Rejected',
      `Your request has been ${approve ? 'approved' : 'rejected'} by ${actor.fullName}.`,
      approve ? 'INFO' : 'ERROR',
      '/leave'
    );

    return updated;
  }

  static async hrFinalReview(leaveId: string, hrId: string, approve: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'HR_REVIEW') {
        throw new Error(`Invalid stage: Leave is currently in ${leave.status} status. Final approval requires HR_REVIEW status.`);
    }

    const actor = await prisma.user.findUnique({ 
      where: { id: hrId },
      include: {
        managedReportingLines: {
          where: { employeeId: leave.employeeId, type: 'DOTTED', effectiveTo: null }
        }
      }
    });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);

    // Step 2: Final Review logic:
    // 1. MD, Director, or HR (Rank >= 75)
    // 2. Secondary Supervisor (Dotted Line)
    const isSecondaryManager = actor.managedReportingLines && actor.managedReportingLines.length > 0;
    const isHighRank = rank >= 75;

    if (!isSecondaryManager && !isHighRank) {
       throw new Error('Unauthorized for Step 2 Final Approval. Only the Secondary Supervisor, MD, or HR can perform this step.');
    }

    const nextStatus = approve ? 'APPROVED' : 'HR_REJECTED';

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: nextStatus as any,
          hrComment: comment,
          hrReviewerId: hrId
        }
      });

      if (approve) {
        // Atomic balance deduction
        const user = await tx.user.findUnique({ where: { id: leave.employeeId } });
        if (user) {
          await tx.user.update({
            where: { id: user.id },
            data: { leaveBalance: { decrement: leave.leaveDays || 0 } }
          });
        }
      }

      await notify(leave.employeeId, 
        approve ? '🎉 Leave Fully Approved' : '❌ HR/MD Rejected',
        `Your leave has been ${approve ? 'finalized and approved' : 'rejected'} by ${actor.fullName}.`,
        approve ? 'SUCCESS' : 'ERROR',
        '/leave'
      );

      return updated;
    });
  }

  private static calculateWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (cur <= endDate) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  }
}
