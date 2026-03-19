import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};

    let departments = await prisma.department.findMany({
      where: whereOrg,
      include: {
        manager: {
          select: { fullName: true }
        },
        employees: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Fallback: If no departments for current tenant, try to find default-tenant ones
    if (departments.length === 0 && orgId && orgId !== 'default-tenant') {
       departments = await prisma.department.findMany({
         where: { organizationId: 'default-tenant' },
         include: {
           manager: { select: { fullName: true } },
           employees: { select: { id: true } }
         },
         orderBy: { name: 'asc' }
       });
    }

    const employeeIds = departments.flatMap((dept) => dept.employees.map((emp) => emp.id));
    const sheets = await prisma.kpiSheet.findMany({
      where: {
        ...whereOrg,
        employeeId: { in: employeeIds },
        totalScore: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: { employeeId: true, totalScore: true }
    });

    const latestScores = new Map<string, number>();
    for (const sheet of sheets) {
      if (!sheet.employeeId || latestScores.has(sheet.employeeId)) continue;
      latestScores.set(sheet.employeeId, sheet.totalScore ?? 0);
    }

    const payload = departments.map((dept) => {
      const scores = dept.employees
        .map((emp) => latestScores.get(emp.id))
        .filter((score): score is number => typeof score === 'number');
      const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      return {
        id: dept.id,
        name: dept.name,
        managerId: dept.managerId,
        manager: dept.manager ? { fullName: dept.manager.fullName } : null,
        memberCount: dept.employees.length,
        score: Math.round(avgScore)
      };
    });

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'default-tenant';
    const { name, managerId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Department name is required' });
    const existing = await prisma.department.findFirst({ where: { name: name.trim(), organizationId } });
    if (existing) return res.status(409).json({ error: 'Department already exists' });
    const dept = await prisma.department.create({ data: { name: name.trim(), organizationId, ...(managerId ? { managerId } : {}) } });
    res.status(201).json({ id: dept.id, name: dept.name, score: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const { name, managerId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Department name is required' });
    const dept = await prisma.department.update({
      where: { id: Number(req.params.id), ...whereOrg },
      data: { name: name.trim(), ...(managerId !== undefined ? { managerId: managerId || null } : {}) }
    });
    res.json({ id: dept.id, name: dept.name, score: 0 });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Department not found' });
    res.status(500).json({ error: err.message });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    // Check no active employees
    const count = await prisma.user.count({
      where: { departmentId: Number(req.params.id), ...whereOrg, status: 'ACTIVE' }
    });
    if (count > 0) return res.status(409).json({ error: `Cannot delete: ${count} active employee(s) in this department` });
    await prisma.department.delete({ where: { id: Number(req.params.id), ...whereOrg } });
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Department not found' });
    res.status(500).json({ error: err.message });
  }
};
