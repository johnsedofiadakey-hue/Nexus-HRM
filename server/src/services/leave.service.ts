import prisma from '../prisma/client';
import { logAction } from './audit.service';
import { notify } from './websocket.service';
import { getRoleRank } from '../middleware/auth.middleware';

/**
 * Leave Statuses (V3):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED, 
 * MANAGER_REVIEW, MANAGER_APPROVED, MANAGER_REJECTED, 
 * MD_REVIEW, APPROVED, MD_REJECTED, CANCELLED
 */

export class LeaveService {
  /**
   * Request leave. 
   * Moves to SUBMITTED if reliever is specified, or direct to MANAGER_REVIEW if none.
   */
  static async requestLeave(organizationId: string, employeeId: string, data: any) {
    const { startDate, endDate, reason, relieverId, leaveType, handoverNotes } = data;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check for public holidays and weekends
    const holidays = await prisma.publicHoliday.findMany({
      where: { 
        OR: [
          { date: { gte: start, lte: end } },
          { isRecurring: true } // Simplified check for recurring
        ]
      }
    });

    const leaveDays = this.calculateWorkingDaysWithHolidays(start, end, holidays);

    const user = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!user) throw new Error('User not found');
    
    // Virtual Balance check: Actual Balance - Pending Requests
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { employeeId, status: { in: ['SUBMITTED', 'RELIEVER_ACCEPTED', 'MANAGER_REVIEW', 'HR_REVIEW'] } }
    });
    const pendingDays = pendingRequests.reduce((sum, r) => sum + Number(r.leaveDays || 0), 0);

    const availableBalance = Number(user.leaveBalance || 0) - pendingDays;
    
    if (availableBalance < leaveDays) {
      throw new Error(`Insufficient available balance. You have ${user.leaveBalance} days, but ${pendingDays} days are already tied up in pending requests. Available: ${availableBalance}, Needed: ${leaveDays}`);
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
        handoverNotes: handoverNotes || null,
        relieverAcceptanceRequired: !!data.relieverAcceptanceRequired,
        status: initialStatus
      }
    });

    if (relieverId) {
      const noteSnippet = handoverNotes ? `\n\nHandover Notes: ${handoverNotes.substring(0, 100)}${handoverNotes.length > 100 ? '...' : ''}` : '';
      await notify(relieverId, '🤝 Handover Request', 
        `${user.fullName} has requested you as a reliever for leave.${noteSnippet}`, 'INFO', '/leave');
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
      include: { employee: true, reliever: { select: { fullName: true } } }
    });

    if (!leave) throw new Error('Leave request not found');
    if (leave.relieverId !== relieverId) throw new Error('Not authorized to respond as reliever');
    if (leave.status !== 'SUBMITTED') throw new Error('Leave is not in SUBMITTED state');

    const nextStatus = accept ? 'MANAGER_REVIEW' : 'RELIEVER_DECLINED';
    
    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          relieverStatus: accept ? 'ACCEPTED' : 'DECLINED',
          relieverComment: comment,
          relieverRespondedAt: new Date(),
          handoverAcknowledged: accept,
          status: nextStatus
        }
      });

      if (accept) {
        // Create permanent Handover Register record for auditing
        await tx.handoverRecord.create({
          data: {
            organizationId: leave.organizationId || 'default-tenant',
            leaveRequestId: leaveId,
            requesterId: leave.employeeId,
            relieverId: relieverId,
            handoverNotes: leave.handoverNotes,
            status: 'ACCEPTED'
          }
        });

        if (leave.employee.supervisorId) {
          await notify(leave.employee.supervisorId, '📝 Leave Pending Line Manager Review', 
            `${leave.employee.fullName}'s leave is now ready for your review. Handover accepted by ${leave.reliever?.fullName || 'colleague'}.`, 'INFO', '/team/leave');
        }
      }

      // Notify employee
      await notify(leave.employeeId, 
        accept ? '✅ Reliever Accepted' : '❌ Reliever Declined',
        `${leave.reliever?.fullName || 'Colleague'} has ${accept ? 'accepted' : 'declined'} your reliever request for leave starting ${leave.startDate.toLocaleDateString()}.`,
        accept ? 'SUCCESS' : 'WARNING',
        '/leave'
      );

      return updated;
    });
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

    // ── L1 FIX: Enforce reliever acceptance if required ──────────────────────
    if (leave.relieverAcceptanceRequired && leave.relieverId && leave.status === 'SUBMITTED') {
      throw new Error('This leave requires reliever acceptance before manager approval can proceed.');
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

    const nextStatus = approve ? 'MD_REVIEW' : 'MANAGER_REJECTED'; // MD_REVIEW is the stage for final sign-off

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status: nextStatus as any,
        managerComment: comment,
        managerId: managerId
      }
    });

    await notify(leave.employeeId, 
      approve ? '📋 Line Manager Approved' : '❌ Line Manager Rejected',
      `Your request has been ${approve ? 'approved' : 'rejected'} by your Line Manager, ${actor.fullName}. It now moves to the MD for final sign-off.`,
      approve ? 'INFO' : 'ERROR',
      '/leave'
    );

    return updated;
  }

  static async mdFinalReview(leaveId: string, mdId: string, approve: boolean, comment?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true }
    });

    if (!leave) throw new Error('Leave request not found');
    if (leave.status !== 'MD_REVIEW') {
        throw new Error(`Invalid stage: Leave is currently in ${leave.status} status. Final approval requires MD_REVIEW status.`);
    }

    const actor = await prisma.user.findUnique({ 
      where: { id: mdId },
      include: {
        managedReportingLines: {
          where: { employeeId: leave.employeeId, type: 'DOTTED', effectiveTo: null }
        }
      }
    });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);

    // Step 2: Final MD Review logic:
    // Strictly require MD (90) or high-rank HR Executive (typically MD/CEO proxy)
    const isHighRank = rank >= 90;

    if (!isHighRank) {
       throw new Error('Unauthorized for Final Sign-off. This action is reserved for the Managing Director (MD).');
    }

    const nextStatus = approve ? 'APPROVED' : 'MD_REJECTED';

    return prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: nextStatus as any,
          hrComment: comment,
          hrReviewerId: mdId
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
        approve ? '🎉 Leave Fully Approved by MD' : '❌ MD Rejected',
        `Your leave has been finalized and approved by the Managing Director (${actor.fullName}). It is now valid for printing.`,
        approve ? 'SUCCESS' : 'ERROR',
        '/leave'
      );

      return updated;
    });
  }

  /**
   * Check if department leave concurrency exceeds 20%
   */
  static async checkLeaveOverlap(organizationId: string, departmentId: number, startDate: Date, endDate: Date) {
    const totalStaff = await prisma.user.count({
      where: { organizationId, departmentId, status: 'ACTIVE', isArchived: false }
    });

    if (totalStaff === 0) return { warning: false };

    // Find overlapping approved leaves
    const overlapping = await prisma.leaveRequest.count({
      where: {
        organizationId,
        status: 'APPROVED',
        isArchived: false,
        employee: { departmentId: departmentId },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } }
        ]
      }
    });

    const ratio = (overlapping + 1) / totalStaff;
    if (ratio > 0.20) {
      return {
        warning: true,
        message: `Warning: This request will result in ${Math.round(ratio * 100)}% of your department being on leave simultaneously. This exceeds the 20% recommended threshold.`,
        ratio: ratio
      };
    }

    return { warning: false };
  }

  private static calculateWorkingDaysWithHolidays(start: Date, end: Date, holidays: any[]): number {
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    const holidayDates = holidays.map(h => {
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    while (cur <= endDate) {
      const day = cur.getDay();
      const isWeekend = (day === 0 || day === 6);
      const isHoliday = holidayDates.includes(cur.getTime());

      if (!isWeekend && !isHoliday) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
  }
}
