import { Request, Response } from 'express';
import prisma from '../prisma/client';

interface OrgNode {
  id: string; name: string; title: string; role: string;
  department: string; avatar?: string; children: OrgNode[];
}

const ROLE_RANK: Record<string, number> = {
  DEV: 100,
  MD: 90,
  DIRECTOR: 80,
  MANAGER: 70,
  MID_MANAGER: 60,
  STAFF: 50,
  CASUAL: 10
};

const buildTree = (employees: any[], parentId: string | null = null): OrgNode[] => {
  return employees
    .filter(e => (parentId === null ? !e.supervisorId : e.supervisorId === parentId))
    .sort((a, b) => (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0))
    .map(e => ({
      id: e.id,
      name: e.fullName,
      title: e.jobTitle,
      role: e.role,
      department: e.departmentObj?.name || '',
      avatar: e.avatarUrl,
      children: buildTree(employees, e.id)
    }));
};

export const getOrgChart = async (req: Request, res: Response) => {
  const employees = await prisma.user.findMany({
    where: { status: { in: ['ACTIVE', 'PROBATION'] }, role: { not: 'DEV' } },
    select: { id: true, fullName: true, jobTitle: true, role: true, avatarUrl: true, supervisorId: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });

  const sortedFlat = [...employees].sort((a, b) => (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0));

  // ─── HIERARCHY ENFORCEMENT ENGINE ──────────────────────────────────────────
  if (employees.length > 0) {
    const maxRank = Math.max(...employees.map(e => ROLE_RANK[e.role] || 0));
    const rankBuckets: Record<number, any[]> = {};
    employees.forEach(e => {
      const r = ROLE_RANK[e.role] || 0;
      if (!rankBuckets[r]) rankBuckets[r] = [];
      rankBuckets[r].push(e);
    });

    const empMap = new Map(employees.map(e => [e.id, e]));

    // Dynamically reassign invalid supervisors to enforce strict top-down structure
    employees.forEach(e => {
      const myRank = ROLE_RANK[e.role] || 0;

      // Top rankers are always roots
      if (myRank === maxRank) {
        e.supervisorId = null;
        return;
      }

      const currSup = e.supervisorId ? empMap.get(e.supervisorId) : null;
      const currSupRank = currSup ? (ROLE_RANK[currSup.role] || 0) : 0;

      // Valid supervisor exists
      if (currSup && currSupRank > myRank) {
        return;
      }

      // Invalid or no supervisor: find the next highest tier available
      let found = false;
      for (let targetRank = myRank + 10; targetRank <= 100; targetRank += 10) {
        if (rankBuckets[targetRank] && rankBuckets[targetRank].length > 0) {
          e.supervisorId = rankBuckets[targetRank][0].id; // Assign to first available in that tier
          found = true;
          break;
        }
      }

      // Fallback: point to the absolute highest rank
      if (!found && rankBuckets[maxRank] && rankBuckets[maxRank].length > 0) {
        e.supervisorId = rankBuckets[maxRank][0].id;
      }
    });
  }

  const tree = buildTree(employees);
  res.json({ tree, flat: sortedFlat });
};
