import prisma from '../prisma/client';

export interface InboxAction {
  id: string;
  type: 'TARGET_ACK' | 'TARGET_REVIEW' | 'APPRAISAL_REVIEW' | 'LEAVE_RELIEF' | 'LEAVE_APPROVE';
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
       if (p.currentStage === 'SUPERVISOR' && p.employee.supervisorId === userId) isReviewer = true;
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

    // 3. Leave Requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { organizationId, status: { in: ['SUBMITTED', 'MANAGER_REVIEW', 'HR_REVIEW'] } },
      include: { employee: true }
    });

    leaveRequests.forEach(l => {
      // Relief
      if (l.status === 'SUBMITTED' && l.relieverId === userId) {
        actions.push({
          id: `leave-relief-${l.id}`,
          type: 'LEAVE_RELIEF',
          title: 'Relief Request',
          subtitle: `${l.employee.fullName} requested you as a reliever.`,
          priority: 'MEDIUM',
          link: '/leave',
          createdAt: l.createdAt
        });
      }
      // Manager Review
      if (l.status === 'MANAGER_REVIEW' && l.employee.supervisorId === userId) {
        actions.push({
          id: `leave-approve-${l.id}`,
          type: 'LEAVE_APPROVE',
          title: 'Leave Approval Required',
          subtitle: `${l.employee.fullName} is requesting ${l.leaveDays} days.`,
          priority: 'HIGH',
          link: '/leave',
          createdAt: l.createdAt
        });
      }
    });

    return actions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
