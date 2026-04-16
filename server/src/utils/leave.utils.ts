/**
 * Leave Management Utilities
 * Standardizes hierarchical inheritance for leave allowance and balance.
 */

export interface LeaveMetrics {
  allowance: number;
  broughtForward: number;
  balance: number;
}

/**
 * Calculates effective leave allowance, brought forward, and balance for a user.
 * Hierarchy:
 * 1. User-specific override (from user record)
 * 2. Organization-level default (from joined organization record)
 * 3. Global system fallback (30)
 * 
 * @param user - User object potentially containing leaveAllowance, leaveBalance, leaveBroughtForward, and organization
 * @returns Object containing effective allowance, broughtForward and balance as numbers
 */
export const getEffectiveLeaveMetrics = (user: any): LeaveMetrics => {
  // 1. Allowance: User Specific -> Org Default -> System Fallback (30)
  const allowance = Number(
    user.leaveAllowance ?? 
    user.organization?.defaultLeaveAllowance ?? 
    30
  );

  // 2. Brought Forward (Carry Over)
  const broughtForward = Number(user.leaveBroughtForward ?? 0);

  // 3. Balance: User Specific -> Sum of Allocation + BF (Dynamic)
  // If leaveBalance is null, it defaults to the full current pool (Allocation + BF)
  const balance = Number(
    user.leaveBalance ?? 
    (allowance + broughtForward)
  );

  return { allowance, broughtForward, balance };
};
