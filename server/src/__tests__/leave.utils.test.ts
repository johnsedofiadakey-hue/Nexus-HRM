import { describe, it, expect } from 'vitest';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';
import { monthsBetween } from '../services/leave-balance.service';

// ─── getEffectiveLeaveMetrics ─────────────────────────────────────────────────

describe('getEffectiveLeaveMetrics', () => {
  it('uses user-specific allowance when set', () => {
    const user = { leaveAllowance: 20, leaveBalance: 15, leaveBroughtForward: 0, organization: null };
    const metrics = getEffectiveLeaveMetrics(user);
    expect(metrics.allowance).toBe(20);
    expect(metrics.balance).toBe(15);
  });

  it('falls back to org defaultLeaveAllowance when user allowance is null', () => {
    const user = {
      leaveAllowance: null,
      leaveBalance: null,
      leaveBroughtForward: 5,
      organization: { defaultLeaveAllowance: 25 },
    };
    const metrics = getEffectiveLeaveMetrics(user);
    expect(metrics.allowance).toBe(25);
    // balance null → defaults to allowance + broughtForward = 25 + 5 = 30
    expect(metrics.balance).toBe(30);
  });

  it('falls back to 30 when both user and org allowance are null', () => {
    const user = { leaveAllowance: null, leaveBalance: null, leaveBroughtForward: 0, organization: null };
    const metrics = getEffectiveLeaveMetrics(user);
    expect(metrics.allowance).toBe(30);
    expect(metrics.balance).toBe(30);
  });

  it('carries broughtForward into default balance calculation', () => {
    const user = { leaveAllowance: 20, leaveBalance: null, leaveBroughtForward: 3, organization: null };
    const metrics = getEffectiveLeaveMetrics(user);
    expect(metrics.broughtForward).toBe(3);
    expect(metrics.balance).toBe(23); // 20 + 3
  });

  it('uses explicit leaveBalance when set (not recalculated)', () => {
    const user = { leaveAllowance: 20, leaveBalance: 7, leaveBroughtForward: 10, organization: null };
    const metrics = getEffectiveLeaveMetrics(user);
    expect(metrics.balance).toBe(7); // explicit value takes precedence
  });

  it('treats missing leaveBroughtForward as 0', () => {
    const user = { leaveAllowance: 20, leaveBalance: null, leaveBroughtForward: null, organization: null };
    const metrics = getEffectiveLeaveMetrics(user);
    expect(metrics.broughtForward).toBe(0);
    expect(metrics.balance).toBe(20);
  });
});

// ─── monthsBetween ────────────────────────────────────────────────────────────

describe('monthsBetween', () => {
  it('returns 0 for the same month', () => {
    const d = new Date(2024, 0, 1);
    expect(monthsBetween(d, d)).toBe(0);
  });

  it('returns 1 for consecutive months', () => {
    expect(monthsBetween(new Date(2024, 0, 1), new Date(2024, 1, 1))).toBe(1);
  });

  it('returns 12 for one year apart', () => {
    expect(monthsBetween(new Date(2023, 0, 1), new Date(2024, 0, 1))).toBe(12);
  });

  it('returns 0 (not negative) when "to" is before "from"', () => {
    expect(monthsBetween(new Date(2024, 6, 1), new Date(2024, 3, 1))).toBe(0);
  });

  it('handles cross-year boundaries correctly', () => {
    expect(monthsBetween(new Date(2023, 10, 1), new Date(2024, 1, 1))).toBe(3); // Nov → Feb = 3
  });
});
