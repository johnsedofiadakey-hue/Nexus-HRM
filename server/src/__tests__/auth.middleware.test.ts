import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../utils/context', () => ({
  tenantContext: {
    run: vi.fn((_store: any, fn: () => void) => fn()),
    getStore: vi.fn(() => null),
  },
  getTenantId: vi.fn(() => null),
  getUserId: vi.fn(() => null),
}));

import express, { Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import prisma from '../prisma/client';
import { authenticate, requireRole, authorize } from '../middleware/auth.middleware';

// ─── App fixture ──────────────────────────────────────────────────────────────

const makeApp = (rank?: number, roles?: string[]) => {
  const app = express();
  app.use(express.json());
  app.get('/protected',
    authenticate,
    ...(rank !== undefined ? [requireRole(rank)] : []),
    ...(roles ? [authorize(roles)] : []),
    (_req: Request, res: Response) => res.json({ ok: true })
  );
  return app;
};

const JWT_SECRET = process.env.JWT_SECRET!;

const signToken = (payload: object) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

const staffUser = {
  id: 'user-staff',
  role: 'STAFF',
  status: 'ACTIVE',
  fullName: 'Staff User',
  organizationId: 'org-123',
  departmentId: null,
};

const mdUser = {
  id: 'user-md',
  role: 'MD',
  status: 'ACTIVE',
  fullName: 'Managing Director',
  organizationId: 'org-123',
  departmentId: null,
};

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no Authorization header is present', async () => {
    const app = makeApp();
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('returns 401 for malformed token', async () => {
    const app = makeApp();
    const res = await request(app).get('/protected').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('returns 401 for expired token', async () => {
    const app = makeApp();
    const token = jwt.sign({ id: staffUser.id }, JWT_SECRET, { expiresIn: -1 });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 401 when user not found in DB', async () => {
    const app = makeApp();
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const token = signToken({ id: 'ghost-user' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for TERMINATED user', async () => {
    const app = makeApp();
    (prisma.user.findUnique as any).mockResolvedValue({ ...staffUser, status: 'TERMINATED' });
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/deactivated/i);
  });

  it('returns 403 for non-DEV user with no organizationId', async () => {
    const app = makeApp();
    (prisma.user.findUnique as any).mockResolvedValue({ ...staffUser, organizationId: null });
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/organization/i);
  });

  it('passes through and sets req.user for a valid token', async () => {
    const app = express();
    app.use(express.json());
    app.get('/protected', authenticate, (req, res) => res.json(req.user));
    (prisma.user.findUnique as any).mockResolvedValue(staffUser);
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(staffUser.id);
    expect(res.body.role).toBe('STAFF');
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows access when user rank meets the threshold', async () => {
    // MD rank = 90, threshold = 85
    const app = makeApp(85);
    (prisma.user.findUnique as any).mockResolvedValue(mdUser);
    const token = signToken({ id: mdUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('denies access when user rank is below the threshold', async () => {
    // STAFF rank = 50, threshold = 85
    const app = makeApp(85);
    (prisma.user.findUnique as any).mockResolvedValue(staffUser);
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows exact rank match', async () => {
    // STAFF rank = 50, threshold = 50
    const app = makeApp(50);
    (prisma.user.findUnique as any).mockResolvedValue(staffUser);
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── authorize (role list) ────────────────────────────────────────────────────

describe('authorize middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows access when user role is in the allowed list', async () => {
    const app = makeApp(undefined, ['STAFF', 'MANAGER']);
    (prisma.user.findUnique as any).mockResolvedValue(staffUser);
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('denies access when user role is not in the allowed list', async () => {
    const app = makeApp(undefined, ['MANAGER', 'DIRECTOR']);
    (prisma.user.findUnique as any).mockResolvedValue(staffUser);
    const token = signToken({ id: staffUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('always allows DEV role regardless of allowed list', async () => {
    const app = makeApp(undefined, ['STAFF']);
    const devUser = { ...staffUser, id: 'user-dev', role: 'DEV', organizationId: null };
    (prisma.user.findUnique as any).mockResolvedValue(devUser);
    const token = signToken({ id: devUser.id });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
