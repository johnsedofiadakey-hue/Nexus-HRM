import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { requireDestructiveOperationsEnabled } from '../middleware/data-safety.middleware';

const originalNodeEnv = process.env.NODE_ENV;
const originalFlag = process.env.ALLOW_DESTRUCTIVE_OPERATIONS;

const makeApp = () => {
  const app = express();
  app.post(
    '/dangerous',
    (req, _res, next) => {
      req.user = {
        id: 'md-user',
        role: 'MD',
        name: 'Managing Director',
        organizationId: 'org-test',
        rank: 90,
        departmentId: null,
      };
      next();
    },
    requireDestructiveOperationsEnabled('TEST_PURGE'),
    (_req, res) => res.json({ executed: true })
  );
  return app;
};

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalFlag === undefined) delete process.env.ALLOW_DESTRUCTIVE_OPERATIONS;
  else process.env.ALLOW_DESTRUCTIVE_OPERATIONS = originalFlag;
});

describe('requireDestructiveOperationsEnabled', () => {
  it('blocks destructive operations in production even when the flag is enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DESTRUCTIVE_OPERATIONS = 'true';

    const response = await request(makeApp()).post('/dangerous');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('DESTRUCTIVE_OPERATION_DISABLED');
  });

  it('blocks destructive operations by default outside production', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ALLOW_DESTRUCTIVE_OPERATIONS;

    const response = await request(makeApp()).post('/dangerous');

    expect(response.status).toBe(403);
  });

  it('permits an explicitly enabled destructive operation only outside production', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DESTRUCTIVE_OPERATIONS = 'true';

    const response = await request(makeApp()).post('/dangerous');

    expect(response.status).toBe(200);
    expect(response.body.executed).toBe(true);
  });
});
