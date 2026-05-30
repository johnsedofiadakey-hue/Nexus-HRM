import { vi } from 'vitest';

// Ensure JWT_SECRET is always set in test environment
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum!!';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global mock for Prisma — prevents any real DB calls in unit tests
vi.mock('../prisma/client', () => {
  const mock = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    loginSecurityEvent: {
      create: vi.fn(),
    },
    payrollRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    payrollItem: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
    },
    expenseClaim: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    loan: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    loanInstallment: {
      findMany: vi.fn(),
    },
    appraisalPacket: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appraisalReview: {
      upsert: vi.fn(),
    },
    employeeHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn({
      user: { findMany: vi.fn(), update: vi.fn() },
      organization: { findUnique: vi.fn() },
    })),
  };

  return {
    default: mock,
    prisma: mock,
    prismaClient: mock,
  };
});

// Suppress console noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
