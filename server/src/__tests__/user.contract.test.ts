import { describe, expect, it } from 'vitest';
import { CreateUserSchema } from '../middleware/validate.middleware';

const basePayload = {
  email: 'new.hire@example.com',
  fullName: 'New Hire',
  role: 'STAFF' as const,
  jobTitle: 'Test Operations',
};

describe('CreateUserSchema', () => {
  it('normalizes empty-string optional UUID fields from the Add Employee form', () => {
    const result = CreateUserSchema.safeParse({
      ...basePayload,
      subUnitId: '',
      supervisorId: '',
      secondarySupervisorId: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subUnitId).toBeUndefined();
      expect(result.data.supervisorId).toBeUndefined();
      expect((result.data as any).secondarySupervisorId).toBeUndefined();
    }
  });

  it('still rejects a malformed non-empty subUnitId', () => {
    const result = CreateUserSchema.safeParse({ ...basePayload, subUnitId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed subUnitId', () => {
    const result = CreateUserSchema.safeParse({
      ...basePayload,
      subUnitId: '11111111-1111-4111-8111-111111111111',
    });
    expect(result.success).toBe(true);
  });
});
