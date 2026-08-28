import prisma from '../prisma/client';
import { getRoleRank } from '../middleware/auth.middleware';
import { HierarchyService } from './hierarchy.service';

export interface InboxAction {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE' | 'EXPENSE_APPROVE';
  title: string;
  subtitle: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  link: string;
  data?: any;
  createdAt: Date;
}

export class InboxService {
  static async getActions(organizationId: string, userId: string): Promise<InboxAction[]> {
    const actions: InboxAction[] = [];

    // 1. Targets (Assignee Acknowledge)
    const pendingTargets = await prisma.target.findMany({
      where: { organizationId, assigneeId: userId, status: 'ASSIGNED' }
    });
    pendingTargets.forEach(t => {
      actions.push({
        id: `target-ack-${t.id}`,
        type: 'TARGET_ACK',
        title: 'Target Acknowledgement Required',
        subtitle: `Please acknowledge: ${t.title || 'New Target'}`,
        priority: 'MEDIUM',
        link: '/kpi/my-targets',
        createdAt: t.createdAt
      });
    });

    // 2. Appraisal Packets
    const appraisalPackets = await prisma.appraisalPacket.findMany({
      where: { organizationId, status: 'OPEN' }, // Status is OPEN for active packets
      include: { employee: true, cycle: true }
    });

    appraisalPackets.forEach(p => {
       let isReviewer = false;
       if (p.currentStage === 'SUPERVISOR_REVIEW' && p.employee.supervisorId === userId) isReviewer = true;
       if (p.currentStage === 'MANAGER' && (p as any).managerId === userId) isReviewer = true;
       // p for AppraisalPacket has hrReviewerId stored
       if (p.currentStage === 'HR' && (p as any).hrReviewerId === userId) isReviewer = true;

       if (isReviewer) {
         actions.push({
           id: `appraisal-${p.id}`,
           type: 'APPRAISAL_REVIEW',
           title: 'Appraisal Review Required',
           subtitle: `Review for ${p.employee.fullName} (${p.currentStage} stage)`,
           priority: 'HIGH',
           link: `/reviews/packet/${p.id}`,
           createdAt: p.updatedAt
         });
       }
    });

    // 3. Leave Requests - Optimized for Database-level filtering
    const userRec = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const userRank = getRoleRank(userRec?.role || 'STAFF');

    const leaveWhere: any = {
      organizationId,
      status: { in: ['SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW', 'MD_REVIEW'] }
    };

    // Construct the visibility logic directly in the DB query
    const visibilityFilters: any[] = [];

    // Reliever filter
    visibilityFilters.push({ relieverId: userId, status: 'SUBMITTED' });

    // Manager filter — aligned with LeaveService.managerReview's own authorization
    // (rank>=75 is a high-rank override there; below that, scope to actual
    // managed employees via HierarchyService, which also covers matrix/dotted-line
    // reports — same scoping already used by the dedicated "Pending" queue).
    if (userRank >= 75) {
      visibilityFilters.push({ status: 'MANAGER_REVIEW' });
    } else {
      const managedIds = await HierarchyService.getManagedEmployeeIds(userId, organizationId);
      visibilityFilters.push({ status: 'MANAGER_REVIEW', employeeId: { in: managedIds } });
    }

    // HR filter
    if (userRank >= 75) {
      visibilityFilters.push({ status: 'HR_REVIEW' });
    }

    // MD/Director filter — aligned with LeaveService.mdFinalReview's own
    // authorization (rank>=80), not just literal MDs.
    if (userRank >= 80) {
      visibilityFilters.push({ status: 'MD_REVIEW' });
    }

    leaveWhere.OR = visibilityFilters;

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: leaveWhere,
      include: { employee: true }
    });

    leaveRequests.forEach(l => {
      const type = (l.status === 'SUBMITTED' && l.relieverId === userId) ? 'LEAVE_RELIEF' : 'LEAVE_APPROVE';

      actions.push({
        id: `leave-${l.id}`,
        type: type as any,
        title: type === 'LEAVE_RELIEF' ? 'Relief Request' : 'Leave Approval Required',
        subtitle: type === 'LEAVE_RELIEF'
          ? `${l.employee.fullName} requested you as a reliever.`
          : `${l.employee.fullName} - Stage: ${l.status.replace('_', ' ')}`,
        priority: type === 'LEAVE_RELIEF' ? 'MEDIUM' : 'HIGH',
        // Deep-link straight to the tab that actually handles this action,
        // rather than the default "My Leave" tab.
        link: type === 'LEAVE_RELIEF' ? '/leave?tab=RELIEF' : '/leave?tab=TEAM',
        data: { startDate: l.startDate, endDate: l.endDate, reason: l.reason },
        createdAt: l.createdAt
      });
    });

    // 4. Expense Claims — mirrors getPendingApprovals' own visibility rule
    // (rank>=70 sees all pending org-wide; below that, only direct reports).
    const expenseWhere: any = { organizationId, status: 'PENDING' };
    if (userRank < 70) {
      expenseWhere.employee = { supervisorId: userId };
    }
    const pendingExpenses = await prisma.expenseClaim.findMany({
      where: expenseWhere,
      include: { employee: { select: { fullName: true } } }
    });

    pendingExpenses.forEach(e => {
      actions.push({
        id: `expense-${e.id}`,
        type: 'EXPENSE_APPROVE',
        title: 'Expense Approval Required',
        subtitle: `${e.employee.fullName} - ${e.currency} ${e.amount} (${e.category})`,
        priority: 'HIGH',
        link: '/expenses?tab=approvals',
        data: { amount: e.amount, currency: e.currency, category: e.category, description: e.description },
        createdAt: e.submittedAt
      });
    });

    return actions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
