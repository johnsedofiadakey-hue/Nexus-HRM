import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/hierarchy.service', () => ({
  HierarchyService: {
    getManagedEmployeeIds: vi.fn(),
  },
}));

import prisma from '../prisma/client';
import { InboxService } from '../services/inbox.service';
import { HierarchyService } from '../services/hierarchy.service';

const orgId = 'org-test';
const managerId = 'manager-1';

describe('InboxService.getActions — leave visibility scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).target = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).appraisalPacket = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).leaveRequest = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).expenseClaim = { findMany: vi.fn().mockResolvedValue([]) };
  });

  it('scopes MANAGER_REVIEW visibility to actual managed employees for a plain Manager (rank 70)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'MANAGER' });
    vi.mocked(HierarchyService.getManagedEmployeeIds).mockResolvedValue(['emp-1', 'emp-2']);

    await InboxService.getActions(orgId, managerId);

    const where = (prisma as any).leaveRequest.findMany.mock.calls[0][0].where;
    const managerFilter = where.OR.find((f: any) => f.status === 'MANAGER_REVIEW');
    expect(managerFilter.employeeId).toEqual({ in: ['emp-1', 'emp-2'] });
    expect(HierarchyService.getManagedEmployeeIds).toHaveBeenCalledWith(managerId, orgId);
  });

  it('does not restrict MANAGER_REVIEW visibility by employeeId for a rank>=75 user (matches managerReview\'s own high-rank override)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'HR_OFFICER' });

    await InboxService.getActions(orgId, managerId);

    const where = (prisma as any).leaveRequest.findMany.mock.calls[0][0].where;
    const managerFilter = where.OR.find((f: any) => f.status === 'MANAGER_REVIEW');
    expect(managerFilter.employeeId).toBeUndefined();
    expect(HierarchyService.getManagedEmployeeIds).not.toHaveBeenCalled();
  });

  it('includes MD_REVIEW visibility for a Director (rank 80), matching mdFinalReview\'s own authorization', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'DIRECTOR' });

    await InboxService.getActions(orgId, managerId);

    const where = (prisma as any).leaveRequest.findMany.mock.calls[0][0].where;
    expect(where.OR.some((f: any) => f.status === 'MD_REVIEW')).toBe(true);
  });

  it('excludes MD_REVIEW visibility for a plain Manager (rank 70, below mdFinalReview\'s rank>=80 gate)', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'MANAGER' });
    vi.mocked(HierarchyService.getManagedEmployeeIds).mockResolvedValue([]);

    await InboxService.getActions(orgId, managerId);

    const where = (prisma as any).leaveRequest.findMany.mock.calls[0][0].where;
    expect(where.OR.some((f: any) => f.status === 'MD_REVIEW')).toBe(false);
  });
});

describe('InboxService.getActions — expense claim inbox coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).target = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).appraisalPacket = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).leaveRequest = { findMany: vi.fn().mockResolvedValue([]) };
    (prisma as any).expenseClaim = { findMany: vi.fn().mockResolvedValue([]) };
    vi.mocked(HierarchyService.getManagedEmployeeIds).mockResolvedValue([]);
  });

  it('scopes pending expenses to direct reports only for a rank<70 supervisor', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'SUPERVISOR' });

    await InboxService.getActions(orgId, managerId);

    const where = (prisma as any).expenseClaim.findMany.mock.calls[0][0].where;
    expect(where.employee).toEqual({ supervisorId: managerId });
  });

  it('shows all pending expenses org-wide for a rank>=70 manager, matching getPendingApprovals', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'MANAGER' });

    await InboxService.getActions(orgId, managerId);

    const where = (prisma as any).expenseClaim.findMany.mock.calls[0][0].where;
    expect(where.employee).toBeUndefined();
  });

  it('surfaces a pending expense as an EXPENSE_APPROVE action with amount/currency/category context', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ role: 'MANAGER' });
    (prisma as any).expenseClaim.findMany.mockResolvedValue([{
      id: 'exp-1',
      amount: 250,
      currency: 'GNF',
      category: 'TRAVEL',
      description: 'Taxi to client site',
      submittedAt: new Date('2026-07-01'),
      employee: { fullName: 'Jane Doe' },
    }]);

    const actions = await InboxService.getActions(orgId, managerId);

    const expenseAction = actions.find(a => a.type === 'EXPENSE_APPROVE');
    expect(expenseAction).toBeDefined();
    expect(expenseAction!.link).toBe('/expenses?tab=approvals');
    expect(expenseAction!.subtitle).toContain('Jane Doe');
    expect(expenseAction!.data).toEqual(
      expect.objectContaining({ amount: 250, currency: 'GNF', category: 'TRAVEL' })
    );
  });
});
