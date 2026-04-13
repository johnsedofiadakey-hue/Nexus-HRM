/**
 * Leave Management Utilities
 * Standardizes hierarchical inheritance for leave allowance and balance.
 */

export interface LeaveMetrics {
  allowance: number;
  balance: number;
}

/**
 * Calculates effective leave allowance and balance for a user.
 * Hierarchy:
 * 1. User-specific override (from user record)
 * 2. Organization-level default (from joined organization record)
 * 3. Global system fallback (24)
 * 
 * @param user - User object potentially containing leaveAllowance, leaveBalance, and organization
 * @returns Object containing effective allowance and balance as numbers
 */
export const getEffectiveLeaveMetrics = (user: any): LeaveMetrics => {
  const allowance = Number(
    user.leaveAllowance ?? 
    user.organization?.defaultLeaveAllowance ?? 
    24
  );

  const balance = Number(
    user.leaveBalance ?? 
    allowance
  );

  return { allowance, balance };
};
