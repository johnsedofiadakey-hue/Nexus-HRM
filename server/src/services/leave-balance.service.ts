import prisma from '../prisma/client';

const monthsBetween = (from: Date, to: Date) => {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
};

/**
 * Accrue leave balances for all active users based on their allowance.
 * Optimized for production: Batch processing and atomic updates.
 */
export const accrueLeaveBalances = async () => {
  const now = new Date();
  
  // 1. Fetch users who are due for accrual
  const users = await prisma.user.findMany({
    where: { 
      isArchived: false,
      OR: [
        { leaveAccruedAt: { lt: new Date(now.getFullYear(), now.getMonth(), 1) } },
        { leaveAccruedAt: null }
      ]
    },
    select: { id: true, leaveBalance: true, leaveAllowance: true, leaveAccruedAt: true }
  });

  if (users.length === 0) return 0;

  let updatedCount = 0;

  // Use a transaction for the entire batch to ensure data integrity
  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      const lastAccruedAt = user.leaveAccruedAt || new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthsToAccrue = monthsBetween(lastAccruedAt, now);

      if (monthsToAccrue <= 0) continue;

      const allowance = Number(user.leaveAllowance || 24);
      const balance = Number(user.leaveBalance || 0);
      const monthlyAccrual = allowance / 12;
      const newBalance = balance + (monthlyAccrual * monthsToAccrue);

      await tx.user.update({
        where: { id: user.id },
        data: {
          leaveBalance: Number(newBalance.toFixed(2)),
          leaveAccruedAt: now
        }
      });

      updatedCount += 1;
    }
  });

  return updatedCount;
};
