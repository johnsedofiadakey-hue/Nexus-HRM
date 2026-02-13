import prisma from '../prisma/client';

const monthsBetween = (from: Date, to: Date) => {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
};

export const accrueLeaveBalances = async () => {
  const users = await prisma.user.findMany({
    select: { id: true, leaveBalance: true, leaveAllowance: true, leaveAccruedAt: true }
  });

  let updatedCount = 0;
  const now = new Date();

  for (const user of users) {
    const lastAccruedAt = user.leaveAccruedAt || now;
    const monthsToAccrue = monthsBetween(lastAccruedAt, now);

    if (monthsToAccrue <= 0) continue;

    const monthlyAccrual = (user.leaveAllowance || 24) / 12;
    const newBalance = (user.leaveBalance || 0) + monthlyAccrual * monthsToAccrue;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        leaveBalance: Number(newBalance.toFixed(2)),
        leaveAccruedAt: now
      }
    });

    updatedCount += 1;
  }

  return updatedCount;
};
