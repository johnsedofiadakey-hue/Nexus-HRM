import { describe, expect, it } from 'vitest';
import { LeaveRequestSchema } from '../middleware/validate.middleware';

const basePayload = {
  startDate: '2026-07-02',
  endDate: '2026-07-03',
  reason: 'Annual leave request',
  handoverNotes: '',
  relieverAcceptanceRequired: false,
};

describe('LeaveRequestSchema', () => {
  it('normalizes an empty reliever ID from the default client form', () => {
    const result = LeaveRequestSchema.safeParse({
      ...basePayload,
      leaveType: 'Annual',
      relieverId: '',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.relieverId).toBeUndefined();
  });

  it.each(['Paid', 'Compassionate'] as const)('accepts the %s leave type exposed by the client', leaveType => {
    expect(LeaveRequestSchema.safeParse({ ...basePayload, leaveType }).success).toBe(true);
  });

  it('still rejects a malformed non-empty reliever ID', () => {
    expect(LeaveRequestSchema.safeParse({
      ...basePayload,
      leaveType: 'Annual',
      relieverId: 'not-a-uuid',
    }).success).toBe(false);
  });
});
