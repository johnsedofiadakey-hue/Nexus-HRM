import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import prisma from '../prisma/client';
import leaveRouter from '../routes/leave.routes';

const employeeId = '22222222-2222-4222-8222-222222222222';
const leaveId = '33333333-3333-4333-8333-333333333333';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/leave', leaveRouter);
  return app;
};

const authHeader = () => {
  const token = jwt.sign({ id: employeeId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  return `Bearer ${token}`;
};

describe('DELETE /leave/:id/cancel', () => {
  let leaveRequestUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({
      id: employeeId,
      role: 'STAFF',
      status: 'ACTIVE',
      fullName: 'Test Employee',
      organizationId: 'org-test',
      departmentId: null,
    });

    leaveRequestUpdate = vi.fn().mockResolvedValue({ id: leaveId, status: 'CANCELLED' });
    (prisma as any).leaveRequest = {
      findFirst: vi.fn(),
      update: leaveRequestUpdate,
    };
  });

  const mockLeave = (status: string) =>
    ((prisma as any).leaveRequest.findFirst as any).mockResolvedValue({
      id: leaveId,
      organizationId: 'org-test',
      employeeId,
      status,
    });

  it('allows cancelling a request that is still pending review', async () => {
    mockLeave('MANAGER_REVIEW');

    const response = await request(buildApp())
      .delete(`/leave/${leaveId}/cancel`)
      .set('Authorization', authHeader());

    expect(response.status).toBe(200);
    expect(leaveRequestUpdate).toHaveBeenCalledWith({
      where: { id: leaveId },
      data: { status: 'CANCELLED' },
    });
  });

  it('blocks cancelling an already-approved leave (existing rule)', async () => {
    mockLeave('APPROVED');

    const response = await request(buildApp())
      .delete(`/leave/${leaveId}/cancel`)
      .set('Authorization', authHeader());

    expect(response.status).toBe(400);
    expect(leaveRequestUpdate).not.toHaveBeenCalled();
  });

  it.each(['MANAGER_REJECTED', 'MD_REJECTED', 'RELIEVER_DECLINED', 'CANCELLED'])(
    'blocks re-cancelling a leave that is already %s, preserving its outcome',
    async status => {
      mockLeave(status);

      const response = await request(buildApp())
        .delete(`/leave/${leaveId}/cancel`)
        .set('Authorization', authHeader());

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already/i);
      expect(leaveRequestUpdate).not.toHaveBeenCalled();
    }
  );
});
