import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const ORG_ID = 'org-test';
const EMPLOYEE_ID = 'emp-001';
const SUPERVISOR_ID = 'sup-001';
const DEPT_HEAD_ID = 'depthead-001';
const HR_REVIEWER_ID = 'hr-001';
const FINAL_REVIEWER_ID = 'final-001';
const PACKET_ID = 'packet-001';

const activeCycle = { id: 'cycle-001', title: 'Q1 2025', status: 'ACTIVE', organizationId: ORG_ID };

// A packet whose department template requires manager review AND department-head
// review AND HR review — the full 5-stage sequence.
const fullChainPacket = {
  id: PACKET_ID,
  organizationId: ORG_ID,
  employeeId: EMPLOYEE_ID,
  supervisorId: SUPERVISOR_ID,
  managerId: null,
  matrixSupervisorId: null,
  finalReviewerId: FINAL_REVIEWER_ID,
  hrReviewerId: HR_REVIEWER_ID,
  deptHeadId: DEPT_HEAD_ID,
  stageSequence: JSON.stringify(['SELF_REVIEW', 'MANAGER_REVIEW', 'DEPT_HEAD_REVIEW', 'HR_REVIEW', 'FINAL_REVIEW']),
  templateSnapshot: JSON.stringify({ gapAlertThreshold: 15, selfManagerBlendRatio: 0.2 }),
  currentStage: 'DEPT_HEAD_REVIEW',
  status: 'OPEN',
  cycle: activeCycle,
  employee: { id: EMPLOYEE_ID, fullName: 'Test Employee', role: 'STAFF' },
  reviews: [],
};

const validReviewData = {
  overallRating: 4,
  summary: 'Good performance this quarter with notable achievements.',
  userRank: 70,
  userDeptId: null,
};

describe('AppraisalService — template-driven reviewer chain (DEPT_HEAD_REVIEW / HR_REVIEW)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appraisalReview as any) = { upsert: vi.fn().mockResolvedValue({ id: 'review-1', status: 'SUBMITTED' }) };
    (prisma.employeeHistory as any) = { create: vi.fn().mockResolvedValue({}) };
    (prisma.appraisalPacket as any) = { update: vi.fn().mockResolvedValue({}) };
  });

  it('DEPT_HEAD_REVIEW: the designated department head can submit', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({ ...fullChainPacket, currentStage: 'DEPT_HEAD_REVIEW' });
    await expect(
      AppraisalService.submitReview(PACKET_ID, DEPT_HEAD_ID, ORG_ID, validReviewData)
    ).resolves.toBeDefined();
  });

  it('DEPT_HEAD_REVIEW: the employee cannot submit their own department-head review', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({ ...fullChainPacket, currentStage: 'DEPT_HEAD_REVIEW' });
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, { ...validReviewData, userRank: 50 })
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('DEPT_HEAD_REVIEW: an unrelated staff member cannot submit', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({ ...fullChainPacket, currentStage: 'DEPT_HEAD_REVIEW' });
    await expect(
      AppraisalService.submitReview(PACKET_ID, 'random-user', ORG_ID, { ...validReviewData, userRank: 50 })
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('HR_REVIEW: the designated HR reviewer can submit', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({ ...fullChainPacket, currentStage: 'HR_REVIEW' });
    await expect(
      AppraisalService.submitReview(PACKET_ID, HR_REVIEWER_ID, ORG_ID, validReviewData)
    ).resolves.toBeDefined();
  });

  it('HR_REVIEW: the employee cannot submit their own HR review', async () => {
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({ ...fullChainPacket, currentStage: 'HR_REVIEW' });
    await expect(
      AppraisalService.submitReview(PACKET_ID, EMPLOYEE_ID, ORG_ID, { ...validReviewData, userRank: 50 })
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('MD (rank 90) can submit at DEPT_HEAD_REVIEW and HR_REVIEW too', async () => {
    for (const stage of ['DEPT_HEAD_REVIEW', 'HR_REVIEW']) {
      (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue({ ...fullChainPacket, currentStage: stage });
      await expect(
        AppraisalService.submitReview(PACKET_ID, 'any-md-id', ORG_ID, { ...validReviewData, userRank: 90 })
      ).resolves.toBeDefined();
    }
  });

  it('advances from MANAGER_REVIEW into DEPT_HEAD_REVIEW when the template requires it', async () => {
    const packetAtManagerStage = { ...fullChainPacket, currentStage: 'MANAGER_REVIEW' };
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue(packetAtManagerStage);

    await AppraisalService.submitReview(PACKET_ID, SUPERVISOR_ID, ORG_ID, { ...validReviewData, userRank: 60 });

    const updateCalls = (prisma.appraisalPacket as any).update.mock.calls;
    const stageUpdate = updateCalls.find((c: any) => c[0].data.currentStage);
    expect(stageUpdate[0].data.currentStage).toBe('DEPT_HEAD_REVIEW');
  });

  it('a packet with no stageSequence (no template) still uses the default 3-stage flow', async () => {
    const legacyPacket = {
      ...fullChainPacket,
      stageSequence: null,
      templateSnapshot: null,
      currentStage: 'MANAGER_REVIEW',
    };
    (prisma.appraisalPacket as any).findUnique = vi.fn().mockResolvedValue(legacyPacket);

    await AppraisalService.submitReview(PACKET_ID, SUPERVISOR_ID, ORG_ID, { ...validReviewData, userRank: 60 });

    const updateCalls = (prisma.appraisalPacket as any).update.mock.calls;
    const stageUpdate = updateCalls.find((c: any) => c[0].data.currentStage);
    // Default flow: MANAGER_REVIEW -> FINAL_REVIEW (no DEPT_HEAD_REVIEW/HR_REVIEW)
    expect(stageUpdate[0].data.currentStage).toBe('FINAL_REVIEW');
  });
});

describe('AppraisalService.getReviewerPackets — department head discoverability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appraisalPacket as any).findMany = vi.fn().mockResolvedValue([]);
  });

  it('includes deptHeadId in the reviewer query so a designated department head (rank < 80) sees their assigned packets', async () => {
    vi.spyOn(await import('../services/hierarchy.service'), 'HierarchyService', 'get').mockReturnValue({
      getManagedEmployeeIds: vi.fn().mockResolvedValue([]),
    } as any);

    await AppraisalService.getReviewerPackets(DEPT_HEAD_ID, ORG_ID, 70);

    const call = (prisma.appraisalPacket as any).findMany.mock.calls[0][0];
    const orClauses = JSON.stringify(call.where.OR);
    expect(orClauses).toContain('deptHeadId');
  });
});

describe('AppraisalService.calculateSuggestedScore — configurable self/manager blend', () => {
  const reviews = [
    { reviewStage: 'SELF_REVIEW', status: 'SUBMITTED', overallRating: 100 },
    { reviewStage: 'MANAGER_REVIEW', status: 'SUBMITTED', overallRating: 50 },
  ];

  it('defaults to a 20/80 self/manager split', () => {
    // 100*0.2 + 50*0.8 = 20 + 40 = 60
    expect(AppraisalService.calculateSuggestedScore(reviews)).toBe(60);
  });

  it('honors a custom blend ratio (e.g. 50/50)', () => {
    // 100*0.5 + 50*0.5 = 75
    expect(AppraisalService.calculateSuggestedScore(reviews, 0.5)).toBe(75);
  });

  it('honors a 0% self weight (pure manager score)', () => {
    expect(AppraisalService.calculateSuggestedScore(reviews, 0)).toBe(50);
  });
});
