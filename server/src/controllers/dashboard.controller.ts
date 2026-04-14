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
    const orgId = ((req as any).user?.organizationId) || 'default-tenant';
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    const deptFilter = departmentId ? { employee: { departmentId } } : {};

    // 1. Fetch the 2 latest completed or active cycles to calculate change
    const cycles = await prisma.appraisalCycle.findMany({
      where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    const currentCycleId = cycles[0]?.id;
    const previousCycleId = cycles[1]?.id;

    // 2. Performance Stats (using finalScore from packets)
    const currentPackets = currentCycleId 
      ? await prisma.appraisalPacket.findMany({
          where: { cycleId: currentCycleId, finalScore: { not: null }, ...deptFilter },
          select: { finalScore: true }
        })
      : [];
    
    const previousPackets = previousCycleId
      ? await prisma.appraisalPacket.findMany({
          where: { cycleId: previousCycleId, finalScore: { not: null }, ...deptFilter },
          select: { finalScore: true }
        })
      : [];

    const currentPerf = currentPackets.length 
      ? currentPackets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / currentPackets.length 
      : 0;
    
    const previousPerf = previousPackets.length
      ? previousPackets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / previousPackets.length
      : 0;

    const currentSelfReviews = currentCycleId
      ? await prisma.appraisalReview.findMany({
          where: { 
            packet: { cycleId: currentCycleId, ...deptFilter }, 
            reviewStage: 'SELF', 
            overallRating: { not: null } 
          },
          select: { overallRating: true }
        })
      : [];

    const previousSelfReviews = previousCycleId
      ? await prisma.appraisalReview.findMany({
          where: { 
            packet: { cycleId: previousCycleId, ...deptFilter }, 
            reviewStage: 'SELF', 
            overallRating: { not: null } 
          },
          select: { overallRating: true }
        })
      : [];

    const currentMorale = currentSelfReviews.length
      ? currentSelfReviews.reduce((sum, r) => sum + Number(r.overallRating || 0), 0) / currentSelfReviews.length
      : currentPerf; // Fallback to perf if no self-reviews yet

    const previousMorale = previousSelfReviews.length
      ? previousSelfReviews.reduce((sum, r) => sum + Number(r.overallRating || 0), 0) / previousSelfReviews.length
      : previousPerf;

    // 4. Critical Issues (Leave Requests pending)
    const criticalIssues = await prisma.leaveRequest.count({
      where: { organizationId: orgId, status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] }, isArchived: false }
    });

    // 5. Top Performers (Count of packets with score >= 85)
    const topPerformers = currentPackets.filter(p => Number(p.finalScore || 0) >= 85).length;

    // 6. Real-time Suite Stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [openJobs, expenseAgg, personalExpenses, activeTickets, presentLogs, totalUsers] = await Promise.all([
      prisma.jobPosition.count({ where: { organizationId: orgId, status: 'OPEN' } }),
      prisma.expenseClaim.aggregate({ 
        where: { organizationId: orgId, status: 'PENDING' }, 
        _sum: { amount: true } 
      }),
      prisma.expenseClaim.aggregate({
        where: { organizationId: orgId, employeeId: (req as any).user.id, status: 'PENDING' },
        _sum: { amount: true }
      }),
      prisma.supportTicket.count({ where: { organizationId: orgId, status: 'OPEN' } }),
      prisma.attendanceLog.count({ 
        where: { organizationId: orgId, status: 'PRESENT', date: { gte: thirtyDaysAgo } } 
      }),
      prisma.user.count({ where: { organizationId: orgId, isArchived: false } })
    ]);

    // Calculate Attendance Rate (Assume 22 working days per month for the period)
    const possibleWorkDays = 22;
    const totalPotentialLogs = totalUsers * possibleWorkDays;
    const attendanceRate = totalPotentialLogs > 0 
      ? Math.min(100, Math.round((presentLogs / totalPotentialLogs) * 100)) 
      : 0;

    res.json({
      avgPerformance: Math.round(currentPerf),
      performanceChange: formatChange(currentPerf, previousPerf),
      teamMorale: Math.round(currentMorale * 10) / 10,
      moraleChange: formatChange(currentMorale, previousMorale),
      criticalIssues,
      topPerformers,
      openJobs,
      pendingExpenses: Number(expenseAgg._sum.amount || 0),
      myClaims: Number(personalExpenses._sum.amount || 0),
      activeTickets,
      attendanceRate,
      headcount: totalUsers
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardPerformance = async (req: Request, res: Response) => {
  try {
    const orgId = ((req as any).user?.organizationId) || 'default-tenant';
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId as string) : undefined;
    const deptFilter = departmentId ? { employee: { departmentId } } : {};

    // Fetch last 6 completed cycles for the trend line
    const cycles = await prisma.appraisalCycle.findMany({
      where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        _count: { select: { packets: { where: { finalScore: { not: null }, ...deptFilter } } } },
        packets: {
          where: { finalScore: { not: null }, ...deptFilter },
          select: { finalScore: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    const data = cycles
      .map((cycle) => {
        const avg = cycle.packets.length
          ? cycle.packets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / cycle.packets.length
          : 0;
        
        return {
          name: cycle.period || cycle.title.substring(0, 5),
          score: clamp(Math.round(avg * 10) / 10),
          target: 80
        };
      })
      .reverse();

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
