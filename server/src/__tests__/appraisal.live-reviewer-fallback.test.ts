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
const EMPLOYEE_ID = 'emp-002';
const STALE_SUPERVISOR_ID = 'sup-old'; // snapshot taken at cycle-init time
const CURRENT_SUPERVISOR_ID = 'sup-new'; // employee was reassigned after the packet was created
const FINAL_REVIEWER_ID = 'final-002';
const PACKET_ID = 'packet-002';

const packet = {
  id: PACKET_ID,
  organizationId: ORG_ID,
  employeeId: EMPLOYEE_ID,
  supervisorId: STALE_SUPERVISOR_ID,
  managerId: null,
  matrixSupervisorId: null,
  finalReviewerId: FINAL_REVIEWER_ID,
  hrReviewerId: null,
  currentStage: 'MANAGER_REVIEW',
  status: 'OPEN',
  cycle: { id: 'cycle-002', title: 'Q2 2026', status: 'ACTIVE', organizationId: ORG_ID },
  employee: { id: EMPLOYEE_ID, fullName: 'Reassigned Employee', role: 'STAFF' },
  reviews: [],
};

const validReviewData = {
  overallRating: 4,
  summary: 'Solid quarter, met all key deliverables on time.',
  userRank: 60,
};

describe('AppraisalService.submitReview — live reviewer fallback for reassigned managers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.appraisalPacket as any) = {
      findUnique: vi.fn().mockResolvedValue(packet),
      update: vi.fn().mockResolvedValue({}),
    };
    (prisma.appraisalReview as any) = {
      upsert: vi.fn().mockResolvedValue({ id: 'review-2', status: 'SUBMITTED' }),
    };
    (prisma.employeeHistory as any) = {
      create: vi.fn().mockResolvedValue({}),
    };
    // HierarchyService.getManagedEmployeeIds internals — the employee now reports to
    // CURRENT_SUPERVISOR_ID via a direct EmployeeReporting/supervisorId line, even
    // though the packet's frozen snapshot still says STALE_SUPERVISOR_ID.
    (prisma as any).department = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma.user.findMany as any).mockResolvedValue([{ id: EMPLOYEE_ID }]);
    (prisma as any).employeeReporting = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('rejects the stale snapshot manager’s replacement when neither snapshot nor live lookup matches', async () => {
    (prisma.user.findMany as any).mockResolvedValue([]); // reassigned manager has no live reports either
    await expect(
      AppraisalService.submitReview(PACKET_ID, 'random-user', ORG_ID, validReviewData)
    ).rejects.toThrow(/not the authorized reviewer/i);
  });

  it('allows the employee’s CURRENT manager to submit the review even though the packet snapshot still points at the old manager', async () => {
    const review = await AppraisalService.submitReview(PACKET_ID, CURRENT_SUPERVISOR_ID, ORG_ID, validReviewData);
    expect(review).toHaveProperty('status', 'SUBMITTED');
    expect(prisma.appraisalReview.upsert).toHaveBeenCalled();
  });
});
