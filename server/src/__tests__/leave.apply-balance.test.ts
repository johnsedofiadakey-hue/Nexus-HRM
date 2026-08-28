import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import prisma from '../prisma/client';
import leaveRouter from '../routes/leave.routes';

const employeeId = '44444444-4444-4444-8444-444444444444';
const supervisorId = '55555555-5555-4555-8555-555555555555';

// A Monday-Tuesday range → 2 working days requested, well within a 30-day allowance.
const startDate = '2026-08-03';
const endDate = '2026-08-04';

describe('applyForLeave — balance uses effective metrics, not the raw NULL field', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const employeeRecord = {
      id: employeeId,
      role: 'STAFF',
      status: 'ACTIVE',
      fullName: 'New Hire',
      organizationId: 'org-test',
      departmentId: null,
      supervisorId,
      // Newly created employees have both of these NULL by design — the effective
      // balance should fall back to the org default (30), not be treated as 0.
      leaveBalance: null,
      leaveAllowance: null,
      leaveBroughtForward: null,
    };

    (prisma.user.findUnique as any).mockResolvedValue(employeeRecord);
    (prisma.user as any).findFirst = vi.fn().mockResolvedValue(employeeRecord);
    (prisma as any).publicHoliday = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).organization = {
      ...(prisma as any).organization,
      findUnique: vi.fn().mockResolvedValue({
        allowLeaveBorrowing: false,
        borrowingLimit: 5,
        defaultLeaveAllowance: 30,
      }),
    };
    (prisma as any).leaveRequest = {
      findMany: vi.fn().mockResolvedValue([]), // no pending requests to factor into borrowing
      findFirst: vi.fn().mockResolvedValue(null), // no reliever-lock conflict
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'leave-new', ...data })),
    };
  });

  it('allows a 2-day request for an employee with NULL leaveBalance (effective balance = org default)', async () => {
    const app = express();
    app.use(express.json());
    app.use('/leave', leaveRouter);
    const token = jwt.sign({ id: employeeId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const response = await request(app)
      .post('/leave/apply')
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate, endDate, reason: 'Family event' });

    // Pre-fix, applyForLeave read the raw (NULL) leaveBalance as 0 and would reject
    // this as "insufficient leave balance" even though the employee's effective
    // balance (org default) covers the 2 days requested.
    expect(response.status).toBe(201);
    expect((prisma as any).leaveRequest.create).toHaveBeenCalled();
  });
});
