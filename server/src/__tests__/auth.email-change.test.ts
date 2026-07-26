import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ messageId: 'test' }),
  sendNotification: vi.fn().mockResolvedValue({ messageId: 'test' }),
}));
// The real passwordResetLimiter is a shared, process-wide singleton (5 req/hour
// per IP) — every test in this file would share one counter and start 429-ing
// after 5 requests. Replace it with a pass-through for deterministic tests.
vi.mock('../middleware/rate-limit.middleware', () => ({
  passwordResetLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  refreshLimiter: (_req: any, _res: any, next: any) => next(),
  generalLimiter: (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import prisma from '../prisma/client';
import { sendEmail } from '../services/email.service';
import authRouter from '../routes/auth.routes';

const userId = '11111111-1111-4111-8111-111111111111';
const orgId = 'org-test';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
};

const authToken = jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });

describe('POST /auth/change-email/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).emailChangeToken = {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    };
  });

  it('rejects a request for the same email the user already has', async () => {
    const currentUser = {
      id: userId, role: 'STAFF', status: 'ACTIVE', fullName: 'Jane Doe',
      organizationId: orgId, departmentId: null, email: 'jane@company.com',
    };
    (prisma.user.findUnique as any).mockResolvedValue(currentUser);
    (prisma.user as any).findFirst = vi.fn().mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/auth/change-email/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newEmail: 'jane@company.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already your current email/i);
  });

  it('rejects when another user already has the requested email', async () => {
    const currentUser = {
      id: userId, role: 'STAFF', status: 'ACTIVE', fullName: 'Jane Doe',
      organizationId: orgId, departmentId: null, email: 'jane@company.com',
    };
    (prisma.user.findUnique as any).mockResolvedValue(currentUser);
    (prisma.user as any).findFirst = vi.fn().mockResolvedValue({ id: 'someone-else' });

    const res = await request(buildApp())
      .post('/auth/change-email/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newEmail: 'taken@company.com' });

    expect(res.status).toBe(409);
  });

  it('creates a token and emails the NEW address on a valid request', async () => {
    const currentUser = {
      id: userId, role: 'STAFF', status: 'ACTIVE', fullName: 'Jane Doe',
      organizationId: orgId, departmentId: null, email: 'jane@company.com',
    };
    (prisma.user.findUnique as any).mockResolvedValue(currentUser);
    (prisma.user as any).findFirst = vi.fn().mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/auth/change-email/request')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ newEmail: 'jane.new@company.com' });

    expect(res.status).toBe(200);
    expect((prisma as any).emailChangeToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId, newEmail: 'jane.new@company.com' }) })
    );
    // Confirms the OLD email is never touched here — only the new address gets the link.
    expect((sendEmail as any)).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane.new@company.com' })
    );
  });
});

describe('POST /auth/change-email/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).$transaction = vi.fn().mockResolvedValue([{}, {}]);
  });

  it('rejects a missing token', async () => {
    const res = await request(buildApp()).post('/auth/change-email/confirm').send({});
    expect(res.status).toBe(400);
  });

  it('rejects an unknown token', async () => {
    (prisma as any).emailChangeToken = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await request(buildApp())
      .post('/auth/change-email/confirm')
      .send({ token: 'bogus-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('rejects an expired token', async () => {
    (prisma as any).emailChangeToken = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'tok-1', userId, organizationId: orgId, newEmail: 'jane.new@company.com',
        expiresAt: new Date(Date.now() - 1000), usedAt: null,
        user: { id: userId, status: 'ACTIVE' },
      }),
      delete: vi.fn().mockResolvedValue({}),
    };

    const res = await request(buildApp())
      .post('/auth/change-email/confirm')
      .send({ token: 'expired-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
    expect((prisma as any).emailChangeToken.delete).toHaveBeenCalled();
  });

  it('rejects an already-used token', async () => {
    (prisma as any).emailChangeToken = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'tok-1', userId, organizationId: orgId, newEmail: 'jane.new@company.com',
        expiresAt: new Date(Date.now() + 60_000), usedAt: new Date(),
        user: { id: userId, status: 'ACTIVE' },
      }),
    };

    const res = await request(buildApp())
      .post('/auth/change-email/confirm')
      .send({ token: 'used-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already been used/i);
  });

  it('applies the email change on a valid, unused, unexpired token', async () => {
    (prisma as any).emailChangeToken = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'tok-1', userId, organizationId: orgId, newEmail: 'jane.new@company.com',
        expiresAt: new Date(Date.now() + 60_000), usedAt: null,
        user: { id: userId, status: 'ACTIVE' },
      }),
      update: vi.fn().mockResolvedValue({}),
    };
    (prisma.user as any).findFirst = vi.fn().mockResolvedValue(null); // still free

    const res = await request(buildApp())
      .post('/auth/change-email/confirm')
      .send({ token: 'valid-token' });

    expect(res.status).toBe(200);
    expect((prisma as any).$transaction).toHaveBeenCalled();
  });
});
