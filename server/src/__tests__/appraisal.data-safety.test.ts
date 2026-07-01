import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/websocket.service', () => ({
  notify: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/audit.service', () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

import { prismaClient } from '../prisma/client';
import { AppraisalService } from '../services/appraisal.service';

describe('appraisal destructive-operation containment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tenant-scopes every ultimate reset deletion', async () => {
    const tx = {
      appraisalReview: { deleteMany: vi.fn() },
      appraisalPacket: { deleteMany: vi.fn() },
      appraisalCycle: { deleteMany: vi.fn() },
      performanceScore: { deleteMany: vi.fn() },
      performanceReviewV2: { deleteMany: vi.fn() },
      reviewCycle: { deleteMany: vi.fn() },
      employeeHistory: { deleteMany: vi.fn() },
      notification: { deleteMany: vi.fn() },
    };
    (prismaClient.$transaction as any).mockImplementationOnce((callback: any) => callback(tx));

    await AppraisalService.ultimateReset('org-protected');

    for (const model of [
      tx.appraisalReview,
      tx.appraisalPacket,
      tx.appraisalCycle,
      tx.performanceScore,
      tx.performanceReviewV2,
      tx.reviewCycle,
    ]) {
      expect(model.deleteMany).toHaveBeenCalledWith({ where: { organizationId: 'org-protected' } });
    }
    expect(tx.employeeHistory.deleteMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-protected', type: 'PERFORMANCE' },
    });
    expect(tx.notification.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org-protected' }),
    }));
  });
});
