import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/appraisal.service', () => ({
  AppraisalService: {
    submitReview: vi.fn(),
    finalizePacket: vi.fn(),
  },
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import prisma from '../prisma/client';
import appraisalRouter from '../routes/appraisal.routes';
import { AppraisalService } from '../services/appraisal.service';

const orgId = 'org-test';
const mdId = '11111111-1111-4111-8111-111111111111';
const managerId = '22222222-2222-4222-8222-222222222222';
const packetId = '33333333-3333-4333-8333-333333333333';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/appraisals', appraisalRouter);
  return app;
};

const tokenFor = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

describe('appraisal route validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AppraisalService.submitReview).mockResolvedValue({ id: 'review-1', status: 'SUBMITTED' } as any);
    vi.mocked(AppraisalService.finalizePacket).mockResolvedValue({ id: packetId, status: 'COMPLETED' } as any);
  });

  it('passes the current UI review payload through to AppraisalService.submitReview', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: managerId,
      role: 'IT_MANAGER',
      status: 'ACTIVE',
      fullName: 'System IT Manager',
      organizationId: orgId,
      departmentId: 10,
    });

    const payload = {
      overallRating: 84,
      summary: 'Delivered strong results and improved team reliability.',
      strengths: 'Reliable execution.',
      weaknesses: 'Needs tighter reporting cadence.',
      responses: JSON.stringify({ competencyScores: [] }),
    };

    const response = await request(makeApp())
      .post(`/appraisals/review/${packetId}`)
      .set('Authorization', `Bearer ${tokenFor(managerId)}`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(AppraisalService.submitReview).toHaveBeenCalledWith(
      packetId,
      managerId,
      orgId,
      expect.objectContaining({
        ...payload,
        userRank: 85,
        userDeptId: 10,
      })
    );
  });

  it('accepts MD final sign-off with narrative verdict and growth target objects', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: mdId,
      role: 'MD',
      status: 'ACTIVE',
      fullName: 'Managing Director',
      organizationId: orgId,
      departmentId: null,
    });

    const assignedTargets = [{
      title: 'Improve reporting cadence',
      description: 'Submit a weekly executive status note.',
      metricTitle: 'Weekly reports',
      metricValue: 12,
      metricUnit: 'reports',
    }];

    const response = await request(makeApp())
      .post('/appraisals/final-sign-off')
      .set('Authorization', `Bearer ${tokenFor(mdId)}`)
      .send({
        packetId,
        finalScore: 88,
        finalVerdict: 'Approved by MD after reviewing manager evidence and calibration notes.',
        assignedTargets,
      });

    expect(response.status).toBe(200);
    expect(AppraisalService.finalizePacket).toHaveBeenCalledWith(
      packetId,
      mdId,
      orgId,
      'Approved by MD after reviewing manager evidence and calibration notes.',
      88,
      undefined,
      assignedTargets
    );
  });
});
