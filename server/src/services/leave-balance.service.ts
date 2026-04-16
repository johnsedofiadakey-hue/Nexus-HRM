import prisma from '../prisma/client';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';

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
    select: { 
      id: true, 
      leaveBalance: true, 
      leaveAllowance: true, 
      leaveBroughtForward: true, // Fix for TS error
      leaveAccruedAt: true, 
      organizationId: true,
      hasManualLeaveOverride: true,
      organization: { select: { defaultLeaveAllowance: true } }
    }
  });

  if (users.length === 0) return 0;

  let updatedCount = 0;

  // Use a transaction for the entire batch to ensure data integrity
  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      const org = await tx.organization.findUnique({ 
        where: { id: user.organizationId || 'default-tenant' },
        select: { allowLeaveCarryForward: true, carryForwardLimit: true }
      });

      const lastAccruedAt = user.leaveAccruedAt || new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthsToAccrue = monthsBetween(lastAccruedAt, now);

      if (monthsToAccrue <= 0) continue;

      const metrics = getEffectiveLeaveMetrics(user);
      let balance = metrics.balance;
      const allowance = metrics.allowance;
      const monthlyAccrual = allowance / 12;

      // ── CARRY FORWARD LOGIC: If a year has passed since last accrual ────────
      const lastYear = lastAccruedAt.getFullYear();
      const currentYear = now.getFullYear();
      // Explicit cast to 'any' to resolve persistent Render build failure
      const userObj = user as any;
      let broughtForward = Number(userObj.leaveBroughtForward ?? 0);

      if (currentYear > lastYear && (org?.allowLeaveCarryForward ?? true) && !user.hasManualLeaveOverride) {
        const limit = Number(org?.carryForwardLimit ?? 10);
        console.log(`[LeaveAccrued] Year transition for ${user.id}. Capping carry forward to ${limit}. Old Balance: ${balance}`);
        
        // 1. Finalize what we bring forward
        broughtForward = Math.min(balance, limit);
        
        // 2. Reset the running balance pool to the new brought forward value
        // The monthly accrual for January will be added on top of this.
        balance = broughtForward;
      }

      const newBalance = balance + (monthlyAccrual * monthsToAccrue);

      await tx.user.update({
        where: { id: user.id },
        data: {
          leaveBalance: Number(newBalance.toFixed(2)),
          leaveBroughtForward: broughtForward, // Persist the finalized carry-over
          leaveAccruedAt: now
        }
      });

      updatedCount += 1;
    }
  });

  return updatedCount;
};
