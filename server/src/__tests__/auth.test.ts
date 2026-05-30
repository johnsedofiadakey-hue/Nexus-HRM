import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));

import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Must import after setup.ts has mocked prisma
import prisma from '../prisma/client';
import { login, refreshAccessToken } from '../controllers/auth.controller';

// ─── App fixture ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.post('/auth/login', login);
app.post('/auth/refresh', refreshAccessToken);

// ─── Shared test data ─────────────────────────────────────────────────────────

const ORG_ID = 'org-test-123';
const PASSWORD = 'Test@1234!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 10);

const activeUser = {
  id: 'user-abc',
  email: 'staff@example.com',
  fullName: 'Test Staff',
  role: 'STAFF',
  status: 'ACTIVE',
  passwordHash: PASSWORD_HASH,
  avatarUrl: null,
  organizationId: ORG_ID,
  jobTitle: 'Engineer',
  departmentId: null,
};

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.loginSecurityEvent.create as any).mockResolvedValue({});
    (prisma.refreshToken.create as any).mockResolvedValue({});
  });

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 401 for unknown email', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await request(app).post('/auth/login').send({ email: 'nobody@x.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for terminated account', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ ...activeUser, status: 'TERMINATED' });
    const res = await request(app).post('/auth/login').send({ email: activeUser.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/deactivated/i);
  });

  it('returns 403 for non-DEV user with no organizationId', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ ...activeUser, organizationId: null });
    const res = await request(app).post('/auth/login').send({ email: activeUser.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/organization/i);
  });

  it('returns 401 for wrong password', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(activeUser);
    const res = await request(app).post('/auth/login').send({ email: activeUser.email, password: 'wrong!' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token and user on successful login', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(activeUser);
    const res = await request(app).post('/auth/login').send({ email: activeUser.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.role).toBe('STAFF');
    expect(res.body.user.organizationId).toBe(ORG_ID);
  });

  it('JWT payload contains correct fields', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(activeUser);
    const res = await request(app).post('/auth/login').send({ email: activeUser.email, password: PASSWORD });
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET!) as any;
    expect(decoded.id).toBe(activeUser.id);
    expect(decoded.role).toBe('STAFF');
    expect(decoded.organizationId).toBe(ORG_ID);
  });

  it('normalizes email to lowercase before lookup', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await request(app).post('/auth/login').send({ email: 'STAFF@EXAMPLE.COM', password: PASSWORD });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'staff@example.com' } })
    );
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.refreshToken.create as any).mockResolvedValue({});
    (prisma.refreshToken.update as any).mockResolvedValue({});
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown token hash', async () => {
    (prisma.refreshToken.findUnique as any).mockResolvedValue(null);
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'invalid-token' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for revoked token', async () => {
    (prisma.refreshToken.findUnique as any).mockResolvedValue({
      id: 'rt-1', userId: 'user-abc', revokedAt: new Date(), expiresAt: new Date(Date.now() + 86400000)
    });
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'some-token' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for expired token', async () => {
    (prisma.refreshToken.findUnique as any).mockResolvedValue({
      id: 'rt-1', userId: 'user-abc', revokedAt: null, expiresAt: new Date(Date.now() - 1000)
    });
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'some-token' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for terminated user', async () => {
    (prisma.refreshToken.findUnique as any).mockResolvedValue({
      id: 'rt-1', userId: 'user-abc', revokedAt: null, expiresAt: new Date(Date.now() + 86400000)
    });
    (prisma.user.findUnique as any).mockResolvedValue({ ...activeUser, status: 'TERMINATED' });
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'valid-token' });
    expect(res.status).toBe(403);
  });

  it('returns 200 with new tokens on valid refresh', async () => {
    (prisma.refreshToken.findUnique as any).mockResolvedValue({
      id: 'rt-1', userId: activeUser.id, revokedAt: null, expiresAt: new Date(Date.now() + 86400000)
    });
    (prisma.user.findUnique as any).mockResolvedValue(activeUser);
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'valid-raw-token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('revokes the old token on successful refresh (rotation)', async () => {
    (prisma.refreshToken.findUnique as any).mockResolvedValue({
      id: 'rt-1', userId: activeUser.id, revokedAt: null, expiresAt: new Date(Date.now() + 86400000)
    });
    (prisma.user.findUnique as any).mockResolvedValue(activeUser);
    await request(app).post('/auth/refresh').send({ refreshToken: 'valid-raw-token' });
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt-1' }, data: expect.objectContaining({ revokedAt: expect.any(Date) }) })
    );
  });
});
