import prisma from '../prisma/client';
import { logAction } from './audit.service';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);

export const sendLeaveReminders = async () => {
  const threshold = hoursAgo(48);

  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER'] },
      createdAt: { lt: threshold }
    },
    include: { employee: { select: { fullName: true } } }
  });

  for (const leave of pendingLeaves) {
    await logAction(
      null,
      'LEAVE_APPROVAL_REMINDER',
      'LeaveRequest',
      leave.id,
      {
        employee: leave.employee?.fullName,
        status: leave.status,
        startDate: leave.startDate,
        endDate: leave.endDate
      }
    );
  }

  return pendingLeaves.length;
};

export const sendAppraisalReminders = async () => {
  const threshold = hoursAgo(72);

  const pendingAppraisals = await prisma.appraisal.findMany({
    where: {
      status: { in: ['PENDING_SELF', 'PENDING_MANAGER'] },
      updatedAt: { lt: threshold }
    },
    include: {
      employee: { select: { fullName: true } },
      reviewer: { select: { fullName: true } },
      cycle: { select: { name: true } }
    }
  });

  for (const appraisal of pendingAppraisals) {
    await logAction(
      null,
      'APPRAISAL_REMINDER',
      'Appraisal',
      appraisal.id,
      {
        employee: appraisal.employee?.fullName,
        reviewer: appraisal.reviewer?.fullName,
        status: appraisal.status,
        cycle: appraisal.cycle?.name
      }
    );
  }

  return pendingAppraisals.length;
};
