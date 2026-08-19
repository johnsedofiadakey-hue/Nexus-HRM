import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/hierarchy.service', () => ({
  HierarchyService: {
    getManagedEmployeeIds: vi.fn().mockResolvedValue([]),
  },
}));

import prisma from '../prisma/client';
import { getAllEmployees } from '../controllers/user.controller';

const orgId = 'org-test';

const buildRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('getAllEmployees — search query param', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.user.count as any).mockResolvedValue(0);
  });

  it('applies the search term to the Prisma query for a high-rank (org-wide) user', async () => {
    const req: any = {
      user: { id: 'md-1', organizationId: orgId, role: 'MD', departmentId: null },
      query: { search: 'sedofiadakey' },
    };
    const res = buildRes();

    await getAllEmployees(req, res);

    const callArgs = (prisma.user.findMany as any).mock.calls[0][0];
    expect(JSON.stringify(callArgs.where)).toContain('sedofiadakey');
    expect(callArgs.where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ fullName: { contains: 'sedofiadakey', mode: 'insensitive' } }),
          ]),
        }),
      ])
    );
  });

  it('combines search with hierarchy scoping (AND, not overwrite) for a lower-rank user', async () => {
    const req: any = {
      user: { id: 'mgr-1', organizationId: orgId, role: 'MANAGER', departmentId: 5 },
      query: { search: 'jane' },
    };
    const res = buildRes();

    await getAllEmployees(req, res);

    const callArgs = (prisma.user.findMany as any).mock.calls[0][0];
    // Both the hierarchy-scope OR and the search OR must be present as
    // separate AND-ed conditions — neither should silently replace the other.
    expect(callArgs.where.AND).toHaveLength(2);
  });

  it('returns all matching results when no search term is given (unchanged behavior)', async () => {
    const req: any = {
      user: { id: 'md-1', organizationId: orgId, role: 'MD', departmentId: null },
      query: {},
    };
    const res = buildRes();

    await getAllEmployees(req, res);

    const callArgs = (prisma.user.findMany as any).mock.calls[0][0];
    expect(callArgs.where.AND).toBeUndefined();
  });
});
