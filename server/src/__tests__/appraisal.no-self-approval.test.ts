import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
  initWebSocket: vi.fn(),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../prisma/client';
import { AppraisalService } from '../services/appraisal.service';

const ORG_ID = 'org-test';
// A department head who is the sole member of their own department — a real,
// legitimate org-chart shape (e.g. "System IT Manager" heading "Technology"),
// which means departmentObj.managerId == their own id and initCycle snapshots
// packet.managerId onto their own packet.
const SELF_MANAGING_EMPLOYEE_ID = 'emp-self-managing';
const REAL_SUPERVISOR_ID = 'sup-real';
const PACKET_ID = 'packet-003';

const packetWithSelfReferentialManager = {
  id: PACKET_ID,
  organizationId: ORG_ID,
  employeeId: SELF_MANAGING_EMPLOYEE_ID,
  supervisorId: REAL_SUPERVISOR_ID,
  managerId: SELF_MANAGING_EMPLOYEE_ID, // the loophole: employee is their own dept manager
  matrixSupervisorId: null,
  finalReviewerId: null,
  hrReviewerId: null,
  currentStage: 'MANAGER_REVIEW',
  status: 'OPEN',
  cycle: { id: 'cycle-003', title: 'Q3 2026', status: 'ACTIVE', organizationId: ORG_ID },
  employee: { id: SELF_MANAGING_EMPLOYEE_ID, fullName: 'Self-Managing Dept Head', role: 'IT_MANAGER' },
  reviews: [],
};

const validReviewData = {
  overallRating: 4,
  summary: 'Solid quarter, met all key deliverables on time.',
  userRank: 85, // IT_MANAGER
};

describe('AppraisalService.submitReview — no self-approval even at rank 85+', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appraisalPacket as any) = {
      findUnique: vi.fn().mockResolvedValue(packetWithSelfReferentialManager),
      update: vi.fn().mockResolvedValue({}),
    };
    (prisma.appraisalReview as any) = {
      upsert: vi.fn().mockResolvedValue({ id: 'review-3', status: 'SUBMITTED' }),
    };
    (prisma.employeeHistory as any) = {
      create: vi.fn().mockResolvedValue({}),
    };
    (prisma as any).department = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma as any).employeeReporting = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('blocks the employee from approving their own MANAGER_REVIEW via a self-referential packet.managerId', async () => {
    await expect(
      AppraisalService.submitReview(PACKET_ID, SELF_MANAGING_EMPLOYEE_ID, ORG_ID, validReviewData)
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('blocks the employee from approving their own MANAGER_REVIEW via the blanket rank>=85 oversight bypass', async () => {
    // Even with matching managerId removed, the old blanket "rank >= 85 && status OPEN"
    // bypass alone would have let them in — confirm it no longer does for their own packet.
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue({
      ...packetWithSelfReferentialManager,
      managerId: null,
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, SELF_MANAGING_EMPLOYEE_ID, ORG_ID, validReviewData)
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('still allows the real supervisor to submit the MANAGER_REVIEW normally', async () => {
    const review = await AppraisalService.submitReview(PACKET_ID, REAL_SUPERVISOR_ID, ORG_ID, {
      ...validReviewData,
      userRank: 70,
    });
    expect(review).toHaveProperty('status', 'SUBMITTED');
  });

  it('blocks self-approval of FINAL_REVIEW for a rank>=85 employee on their own packet', async () => {
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue({
      ...packetWithSelfReferentialManager,
      currentStage: 'FINAL_REVIEW',
      finalReviewerId: SELF_MANAGING_EMPLOYEE_ID, // even if somehow set, self should be blocked
    });
    await expect(
      AppraisalService.submitReview(PACKET_ID, SELF_MANAGING_EMPLOYEE_ID, ORG_ID, validReviewData)
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('still allows the employee to submit their own SELF_REVIEW', async () => {
    (prisma.appraisalPacket as any).findUnique.mockResolvedValue({
      ...packetWithSelfReferentialManager,
      currentStage: 'SELF_REVIEW',
    });
    const review = await AppraisalService.submitReview(PACKET_ID, SELF_MANAGING_EMPLOYEE_ID, ORG_ID, validReviewData);
    expect(review).toHaveProperty('status', 'SUBMITTED');
  });
});
