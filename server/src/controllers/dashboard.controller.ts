import { Request, Response } from 'express';
import prisma from '../prisma/client';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const formatChange = (current: number, previous: number) => {
  if (!previous) return '0%';
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
};

const monthLabel = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'short' });
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const sheets = await prisma.kpiSheet.findMany({
      where: { employeeId: { not: null }, totalScore: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { employeeId: true, totalScore: true, createdAt: true }
    });

    const latestByUser = new Map<string, number>();
    for (const sheet of sheets) {
      if (!sheet.employeeId || latestByUser.has(sheet.employeeId)) continue;
      latestByUser.set(sheet.employeeId, sheet.totalScore ?? 0);
    }

    const latestScores = Array.from(latestByUser.values());
    const avgPerformance = latestScores.length
      ? latestScores.reduce((sum, score) => sum + score, 0) / latestScores.length
      : 0;

    const groupedScores = await prisma.kpiSheet.groupBy({
      by: ['year', 'month'],
      _avg: { totalScore: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 2
    });

    const currentPerf = groupedScores[0]?._avg.totalScore ?? 0;
    const previousPerf = groupedScores[1]?._avg.totalScore ?? 0;

    const appraisals = await prisma.appraisal.findMany({
      where: { finalScore: { not: null } },
      select: { finalScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    const avgMorale = appraisals.length
      ? appraisals.reduce((sum, appraisal) => sum + (appraisal.finalScore ?? 0), 0) / appraisals.length
      : avgPerformance;

    const moraleGrouped: Record<string, number[]> = {};
    for (const appraisal of appraisals) {
      const key = `${appraisal.createdAt.getFullYear()}-${appraisal.createdAt.getMonth() + 1}`;
      if (!moraleGrouped[key]) moraleGrouped[key] = [];
      moraleGrouped[key].push(appraisal.finalScore ?? 0);
    }
    const moraleKeys = Object.keys(moraleGrouped).sort().reverse();
    const currentMorale = moraleKeys[0]
      ? moraleGrouped[moraleKeys[0]].reduce((sum, val) => sum + val, 0) / moraleGrouped[moraleKeys[0]].length
      : avgMorale;
    const previousMorale = moraleKeys[1]
      ? moraleGrouped[moraleKeys[1]].reduce((sum, val) => sum + val, 0) / moraleGrouped[moraleKeys[1]].length
      : currentMorale;

    const criticalIssues = await prisma.leaveRequest.count({
      where: { status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] } }
    });

    const topPerformers = latestScores.filter((score) => score >= 85).length;

    res.json({
      avgPerformance: Math.round(avgPerformance),
      performanceChange: formatChange(currentPerf, previousPerf),
      teamMorale: Math.round(avgMorale * 10) / 10,
      moraleChange: formatChange(currentMorale, previousMorale),
      criticalIssues,
      topPerformers
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardPerformance = async (req: Request, res: Response) => {
  try {
    const grouped = await prisma.kpiSheet.groupBy({
      by: ['year', 'month'],
      _avg: { totalScore: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6
    });

    const data = grouped
      .map((item) => ({
        name: monthLabel(item.year, item.month),
        score: clamp(Math.round((item._avg.totalScore ?? 0) * 10) / 10),
        target: 80
      }))
      .reverse();

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
