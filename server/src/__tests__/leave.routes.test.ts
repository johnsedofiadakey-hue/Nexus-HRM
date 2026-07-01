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
  },
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import prisma from '../prisma/client';
import leaveRouter from '../routes/leave.routes';
import { LeaveService } from '../services/leave.service';

const casualId = '11111111-1111-4111-8111-111111111111';
const employeeId = '22222222-2222-4222-8222-222222222222';
const leaveId = '33333333-3333-4333-8333-333333333333';

describe('leave processing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({
      id: casualId,
      role: 'CASUAL',
      status: 'ACTIVE',
      fullName: 'Casual Reliever',
      organizationId: 'org-test',
      departmentId: null,
    });
    (prisma as any).leaveRequest = {
      findUnique: vi.fn().mockResolvedValue({
        id: leaveId,
        organizationId: 'org-test',
        employeeId,
        relieverId: casualId,
        status: 'SUBMITTED',
        employee: {
          role: 'STAFF',
          supervisorId: null,
          departmentId: null,
          fullName: 'Employee',
        },
      }),
    };
    vi.mocked(LeaveService.respondAsReliever).mockResolvedValue({
      id: leaveId,
      status: 'MANAGER_REVIEW',
    } as any);
  });

  it('allows the assigned casual reliever to respond', async () => {
    const app = express();
    app.use(express.json());
    app.use('/leave', leaveRouter);
    const token = jwt.sign({ id: casualId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    const response = await request(app)
      .post('/leave/process')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: leaveId,
        action: 'APPROVE',
        role: 'RELIEVER',
        comment: 'Accepted',
      });

    expect(response.status).toBe(200);
    expect(LeaveService.respondAsReliever).toHaveBeenCalledWith(
      leaveId,
      casualId,
      true,
      'Accepted'
    );
  });
});
