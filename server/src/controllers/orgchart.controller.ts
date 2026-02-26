import { Request, Response } from 'express';
import prisma from '../prisma/client';

interface OrgNode {
  id: string; name: string; title: string; role: string;
  department: string; avatar?: string; children: OrgNode[];
}

const buildTree = (employees: any[], parentId: string | null = null): OrgNode[] => {
  return employees
    .filter(e => (parentId === null ? !e.supervisorId : e.supervisorId === parentId))
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
    where: { status: { in: ['ACTIVE', 'PROBATION'] } },
    select: { id: true, fullName: true, jobTitle: true, role: true, avatarUrl: true, supervisorId: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });

  const tree = buildTree(employees);
  res.json({ tree, flat: employees });
};
