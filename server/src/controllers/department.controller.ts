import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const employeeIds = departments.flatMap((dept) => dept.employees.map((emp) => emp.id));
    const sheets = await prisma.kpiSheet.findMany({
      where: { employeeId: { in: employeeIds }, totalScore: { not: null } },
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
        score: Math.round(avgScore)
      };
    });

    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
