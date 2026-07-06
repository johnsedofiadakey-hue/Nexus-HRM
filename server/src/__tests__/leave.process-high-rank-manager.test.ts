import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/leave.service', () => ({
  LeaveService: {
    respondAsReliever: vi.fn(),
    managerReview: vi.fn(),
    mdFinalReview: vi.fn(),
  },
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import prisma from '../prisma/client';
import leaveRouter from '../routes/leave.routes';
import { LeaveService } from '../services/leave.service';

const itManagerId = '66666666-6666-4666-8666-666666666666';
const employeeId = '22222222-2222-4222-8222-222222222222';
const leaveId = '33333333-3333-4333-8333-333333333333';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/leave', leaveRouter);
  return app;
};

const authHeader = (id: string) => `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1h' })}`;

describe('processLeave — rank 85+ actor approving a staff leave at MANAGER_REVIEW', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // IT_MANAGER is rank 85, same tier as Director/HR Officer — none of which
    // should be blanket-blocked from being a staff member's actual line manager.
    (prisma.user.findUnique as any).mockResolvedValue({
      id: itManagerId,
      role: 'IT_MANAGER',
      status: 'ACTIVE',
      fullName: 'System IT Manager',
      organizationId: 'org-test',
      departmentId: null,
    });
  });

  it('routes a staff leave already at MANAGER_REVIEW to managerReview (not blocked)', async () => {
    (prisma as any).leaveRequest = {
      findUnique: vi.fn().mockResolvedValue({
        id: leaveId,
        organizationId: 'org-test',
        employeeId,
        relieverId: null,
        status: 'MANAGER_REVIEW',
        employee: {
          role: 'STAFF',
          supervisorId: itManagerId,
          departmentId: null,
          fullName: 'Test Account',
        },
      }),
    };
    vi.mocked(LeaveService.managerReview).mockResolvedValue({ id: leaveId, status: 'MD_REVIEW' } as any);

    const response = await request(buildApp())
      .post('/leave/process')
      .set('Authorization', authHeader(itManagerId))
      .send({ id: leaveId, action: 'APPROVE', comment: 'Approved' });

    expect(response.status).toBe(200);
    expect(LeaveService.managerReview).toHaveBeenCalledWith(leaveId, itManagerId, true, 'Approved');
    expect(LeaveService.mdFinalReview).not.toHaveBeenCalled();
  });

  it('still blocks a rank 85+ actor from skipping straight past an un-reviewed staff leave', async () => {
    (prisma as any).leaveRequest = {
      findUnique: vi.fn().mockResolvedValue({
        id: leaveId,
        organizationId: 'org-test',
        employeeId,
        relieverId: null,
        status: 'SUBMITTED',
        employee: {
          role: 'STAFF',
          supervisorId: itManagerId,
          departmentId: null,
          fullName: 'Test Account',
        },
      }),
    };

    const response = await request(buildApp())
      .post('/leave/process')
      .set('Authorization', authHeader(itManagerId))
      .send({ id: leaveId, action: 'APPROVE', comment: 'Approved' });

    expect(response.status).toBe(400);
    expect(LeaveService.managerReview).not.toHaveBeenCalled();
  });
});
