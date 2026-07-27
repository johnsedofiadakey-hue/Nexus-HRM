import prisma from '../prisma/client';
import { notify } from './websocket.service';
import { getRoleRank } from '../middleware/auth.middleware';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';

/**
 * Leave Statuses (V3):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED, 
 * MANAGER_REVIEW, MANAGER_APPROVED, MANAGER_REJECTED, 
 * MD_REVIEW, APPROVED, MD_REJECTED, CANCELLED
 */

export class LeaveService {
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

    if (!accept && (!comment || comment.trim().length < 3)) {
      throw new Error('A rejection reason is required to decline a handover request.');
    }

    const employeeRank = getRoleRank(leave.employee.role);
    const isManager = employeeRank >= 70;
    const nextStatus = accept ? (isManager ? 'MD_REVIEW' : 'MANAGER_REVIEW') : 'RELIEVER_DECLINED';
    
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
            organizationId: leave.organizationId ?? 'default-tenant',
            leaveRequestId: leaveId,
            requesterId: leave.employeeId,
            relieverId: relieverId,
            handoverNotes: leave.handoverNotes,
            status: 'ACCEPTED'
          }
        });

        if (isManager) {
           const md = await tx.user.findFirst({
             where: { organizationId: leave.organizationId ?? 'default-tenant', role: { in: ['MD', 'DIRECTOR'] }, status: 'ACTIVE' },
             orderBy: { role: 'desc' }
           });
           if (md) {
             await notify(md.id, '🛡️ Congé Manager - Passation Acceptée',
               `${leave.employee.fullName} (Manager) a confirmé la passation avec ${leave.reliever?.fullName}. Prêt pour votre décision finale.`, 'WARNING', '/team/leave');
           }
        } else if (leave.employee.supervisorId) {
          await notify(leave.employee.supervisorId, '📝 Congé en Attente de Révision',
            `Le congé de ${leave.employee.fullName} est maintenant prêt pour votre révision. Passation acceptée par ${leave.reliever?.fullName || 'un collègue'}.`, 'INFO', '/team/leave');
        }
      }

      // Notify employee
      await notify(leave.employeeId,
        accept ? '✅ Remplaçant Accepté' : '❌ Remplaçant Refusé',
        accept
          ? `${leave.reliever?.fullName || 'Le collègue'} a accepté votre demande de remplacement pour le congé débutant le ${leave.startDate.toLocaleDateString()}.`
          : `${leave.reliever?.fullName || 'Le collègue'} a refusé votre demande de remplacement pour le congé débutant le ${leave.startDate.toLocaleDateString()}.`,
        accept ? 'SUCCESS' : 'WARNING',
        '/leave'
      );

      return updated;
    });
  }

  static async managerReview(leaveId: string, managerId: string, approve: boolean, comment?: string) {
    return prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { employee: true }
      });

      if (!leave) throw new Error('Leave request not found');
      if (leave.status !== 'MANAGER_REVIEW' && leave.status !== 'RELIEVER_ACCEPTED' && leave.status !== 'SUBMITTED') {
        throw new Error(`Invalid stage: Leave is currently in ${leave.status} status.`);
      }

      // 🛡️ IDEMPOTENCY: Prevent double-processing by different managers
      if (leave.managerId && leave.managerId !== managerId) {
        throw new Error('This leave has already been reviewed by another manager and cannot be processed again.');
      }

      // ── SECURITY: Enforce reliever acceptance if required ──────────────────────
      if (leave.relieverAcceptanceRequired && leave.relieverId) {
        const relieverResponded = leave.relieverStatus !== 'PENDING';
        if (!relieverResponded) {
          throw new Error('This leave requires reliever acceptance before manager approval can proceed.');
        }
        if (leave.relieverStatus === 'DECLINED') {
          throw new Error('Reliever has declined this leave request. Manager approval cannot proceed.');
        }
      }

      const actor = await tx.user.findUnique({ where: { id: managerId }, select: { role: true, departmentId: true } });
      if (!actor) throw new Error('Reviewer account not found');

      const rank = getRoleRank(actor.role);

      // 🛡️ SECURITY: Cannot approve own leave
      if (managerId === leave.employeeId) {
        throw new Error('You cannot approve your own leave request.');
      }

      // Step 1: Manager Review logic:
      const isPrimaryManager = leave.employee.supervisorId === managerId;
      const isDeptManager = actor.departmentId === leave.employee.departmentId && rank >= 70;
      const isHighRank = rank >= 75; // HR (75), Director (80), MD (90)
      // Functional/dotted-line managers (EmployeeReporting) already see this request in
      // their pending queue via HierarchyService.getManagedEmployeeIds — they must also
      // be allowed to act on it here, or they hit a dead-end "Unauthorized" error.
      const isMatrixManager = rank >= 70 && !!(await tx.employeeReporting.findFirst({
        where: { employeeId: leave.employeeId, managerId, effectiveTo: null }
      }));

      if (!isPrimaryManager && !isDeptManager && !isMatrixManager && !isHighRank) {
        throw new Error('Unauthorized for Step 1 Manager Review. You must be the direct supervisor, a manager in the same department, a functional/matrix manager, or an administrator.');
      }

      if (!approve && (!comment || comment.trim().length < 3)) {
        throw new Error('Please provide a reason for rejecting this leave request.');
      }

      const employeeRank = getRoleRank(leave.employee.role);
      const nextStatus = approve ? 'MD_REVIEW' : 'MANAGER_REJECTED'; 

      const updated = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status: nextStatus as any,
          managerComment: comment,
          managerId: managerId
        }
      });

      await notify(leave.employeeId,
        approve ? '📋 Approuvé par le Responsable' : '❌ Rejeté par le Responsable',
        approve
          ? (employeeRank >= 70
              ? `Votre demande a été approuvée et transmise à la Direction pour approbation finale.`
              : `Étape 1 sur 2 terminée : votre responsable a approuvé votre demande. Elle est maintenant transmise à la Direction pour l'approbation finale obligatoire.`)
          : `La direction a rejeté votre demande de congé. Motif : ${comment}`,
        approve ? 'INFO' : 'ERROR',
        '/leave'
      );

      return updated;
    });
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

    const actor = await prisma.user.findUnique({ where: { id: mdId } });
    if (!actor) throw new Error('Reviewer account not found');

    const rank = getRoleRank(actor.role);

    // 🛡️ SECURITY: Cannot approve own leave
    if (mdId === leave.employeeId) {
      throw new Error('You cannot approve your own leave request.');
    }

    // Step 2: Final MD Review logic:
    // Reserved for high-rank administrators (Director level / MD)
    const isHighRank = rank >= 80;

    if (!isHighRank) {
       throw new Error('Unauthorized for Final Sign-off. This action is reserved for high-rank administrators (MD/Director).');
    }

    if (!approve && (!comment || comment.trim().length < 3)) {
      throw new Error('A final rejection reason is required for the audit trail.');
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
        // Atomic balance deduction with inheritance support
        const user = await tx.user.findUnique({ 
          where: { id: leave.employeeId },
          include: { organization: { select: { defaultLeaveAllowance: true } } }
        });
        if (user) {
          const metrics = getEffectiveLeaveMetrics(user);
          const newBalance = metrics.balance - Number(leave.leaveDays || 0);

          await tx.user.update({
            where: { id: user.id },
            data: { leaveBalance: newBalance }
          });
        }
      }

      await notify(leave.employeeId,
        approve ? '🎉 Congé Entièrement Validé' : '❌ Rejet Final de la Direction',
        approve
          ? `Approbation finale terminée : votre congé a été finalisé et approuvé par la Direction Générale (${actor.fullName}). Vous pouvez maintenant imprimer votre certificat.`
          : `La Direction Générale a émis un rejet final de votre demande de congé. Motif : ${comment}`,
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
}
