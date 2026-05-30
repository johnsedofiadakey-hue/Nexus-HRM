import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock side-effect services before importing AppraisalService
vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
  auditMiddleware: vi.fn(),
}));
vi.mock('../services/email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  EmailService: { sendPayslipEmail: vi.fn() },
}));

import prisma from '../prisma/client';
import { AppraisalService } from '../services/appraisal.service';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const ORG_ID = 'org-test';
const EMPLOYEE_ID = 'emp-001';
const SUPERVISOR_ID = 'sup-001';
const FINAL_REVIEWER_ID = 'final-001';
const PACKET_ID = 'packet-001';

const activeCycle = {
  id: 'cycle-001',
  title: 'Q1 2025',
  status: 'ACTIVE',
  organizationId: ORG_ID,
};

const basePacket = {
  id: PACKET_ID,
  organizationId: ORG_ID,
  employeeId: EMPLOYEE_ID,
  supervisorId: SUPERVISOR_ID,
  managerId: null,
  matrixSupervisorId: null,
  finalReviewerId: FINAL_REVIEWER_ID,
  hrReviewerId: null,
  currentStage: 'SELF_REVIEW',
  status: 'OPEN',
  cycle: activeCycle,
  employee: { id: EMPLOYEE_ID, fullName: 'Test Employee', role: 'STAFF' },
  reviews: [],
};

const validReviewData = {
  overallRating: 4,
  summary: 'Good performance this quarter with notable achievements.',
  userRank: 50,
  userDeptId: null,
};

// ─── submitReview: validation guards ─────────────────────────────────────────

describe('AppraisalService.submitReview — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Common mock setup: packet exists and returns from DB
    (prisma.appraisalPacket as any) = {
      findUnique: vi.fn().mockResolvedValue(basePacket),
      update: vi.fn().mockResolvedValue({ ...basePacket, currentStage: 'MANAGER_REVIEW' }),
    };
    (prisma.appraisalReview as any) = {
      upsert: vi.fn().mockResolvedValue({ id: 'review-1', status: 'SUBMITTED' }),
    };
    (prisma.employeeHistory as any) = {
      create: vi.fn().mockResolvedValue({}),
    };
  });

  it('throws when packet is not found', async () => {
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue(null);
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, validReviewData)
    ).rejects.toThrow('Appraisal packet not found');
  });

  it('throws when cycle is not ACTIVE and user is not MD (rank < 90)', async () => {
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue({
      ...basePacket,
      cycle: { ...activeCycle, status: 'CLOSED' }
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, { ...validReviewData, userRank: 50 })
    ).rejects.toThrow(/closed/i);
  });

  it('allows MD (rank 90) to submit even on a closed cycle', async () => {
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue({
      ...basePacket,
      cycle: { ...activeCycle, status: 'CLOSED' }
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, { ...validReviewData, userRank: 90 })
    ).resolves.not.toThrow();
  });

  it('throws when user is not the stage owner', async () => {
    await expect(
      AppraisalService.submitReview(PACKET_ID, 'intruder-user', ORG_ID, { ...validReviewData, userRank: 50 })
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('throws when overallRating is missing', async () => {
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, {
        ...validReviewData,
        overallRating: 0
      })
    ).rejects.toThrow(/valid overall rating/i);
  });

  it('throws when summary is too short (< 10 chars)', async () => {
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, {
        ...validReviewData,
        summary: 'short'
      })
    ).rejects.toThrow(/detailed summary/i);
  });

  it('succeeds with valid data and correct owner during SELF_REVIEW', async () => {
    const review = await AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, validReviewData);
    expect(review).toHaveProperty('status', 'SUBMITTED');
  });
});

// ─── Stage ownership rules ────────────────────────────────────────────────────

describe('AppraisalService.submitReview — stage ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appraisalReview as any) = {
      upsert: vi.fn().mockResolvedValue({ id: 'review-1', status: 'SUBMITTED' }),
    };
    (prisma.employeeHistory as any) = {
      create: vi.fn().mockResolvedValue({}),
    };
    (prisma.appraisalPacket as any) = {
      update: vi.fn().mockResolvedValue({}),
    };
  });

  it('SELF_REVIEW: only the employee can submit', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({
      ...basePacket, currentStage: 'SELF_REVIEW'
    });

    // Employee succeeds
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, validReviewData)
    ).resolves.toBeDefined();

    // Supervisor fails
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue({
      ...basePacket, currentStage: 'SELF_REVIEW'
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, SUPERVISOR_ID, ORG_ID, { ...validReviewData, userRank: 60 })
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('MANAGER_REVIEW: supervisor can submit', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({
      ...basePacket, currentStage: 'MANAGER_REVIEW', reviews: []
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, SUPERVISOR_ID, ORG_ID, { ...validReviewData, userRank: 60 })
    ).resolves.toBeDefined();
  });

  it('MANAGER_REVIEW: employee cannot submit their own manager review', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({
      ...basePacket, currentStage: 'MANAGER_REVIEW'
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, { ...validReviewData, userRank: 50 })
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('FINAL_REVIEW: designated final reviewer can submit', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({
      ...basePacket, currentStage: 'FINAL_REVIEW'
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, FINAL_REVIEWER_ID, ORG_ID, { ...validReviewData, userRank: 70 })
    ).resolves.toBeDefined();
  });

  it('MD or HR Manager (rank >= 85) can submit at any open stage', async () => {
    for (const stage of ['SELF_REVIEW', 'MANAGER_REVIEW', 'FINAL_REVIEW']) {
      (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({
        ...basePacket, currentStage: stage, status: 'OPEN', reviews: []
      });
      await expect(
        AppraisalService.submitReview(PACKET_ID, 'any-admin-id', ORG_ID, { ...validReviewData, userRank: 90 })
      ).resolves.toBeDefined();
    }
  });
});
