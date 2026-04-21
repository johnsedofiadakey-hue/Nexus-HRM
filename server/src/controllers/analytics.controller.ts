import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getExecutiveStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'default-tenant';
        const rank = user.rank || 50;
        const userId = user.id;

        const isExecutive = rank >= 80;
        
        // Scope queries based on executive vs manager
        const userWhere: any = { organizationId, status: 'ACTIVE', role: { not: 'DEV' } };
        if (!isExecutive) userWhere.supervisorId = userId;

        const totalEmployees = await prisma.user.count({ where: userWhere });
        const employeeIds = isExecutive ? [] : (await prisma.user.findMany({ where: userWhere, select: { id: true } })).map(u => u.id);

        const leaveWhere: any = { organizationId };
        if (!isExecutive) leaveWhere.employeeId = { in: employeeIds };

        const activeLeaves = await prisma.leaveRequest.count({
            where: { ...leaveWhere, status: 'APPROVED' }
        });

        const pendingLeaves = await prisma.leaveRequest.count({
            where: { ...leaveWhere, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED'] } }
        });

        const pendingKpis = await prisma.kpiSheet.count({
            where: { 
                organizationId, 
                reviewerId: isExecutive ? undefined : userId, 
                status: 'PENDING_APPROVAL' 
            }
        });

        const draftKpis = await prisma.kpiSheet.count({
            where: { 
                organizationId, 
                reviewerId: isExecutive ? undefined : userId, 
                status: 'DRAFT' 
            }
        });

        const pendingAppraisals = await (prisma as any).appraisalPacket.count({
             where: { 
                 organizationId, 
                 status: { notIn: ['COMPLETED', 'LOCKED', 'ARCHIVED'] },
                 ...(isExecutive ? {} : { OR: [{ supervisorId: userId }, { managerId: userId }, { hrReviewerId: userId }, { finalReviewerId: userId }] })
             }
        });

        const activeDepts = await prisma.department.count({ where: { organizationId } });
        const openJobs = await prisma.jobPosition.count({ where: { organizationId, status: 'OPEN' } });

        let payrollTotal = 0;
        if (isExecutive) {
            const latestRun = await prisma.payrollRun.findFirst({
                where: { organizationId, status: { in: ['APPROVED', 'PAID'] } },
                orderBy: { createdAt: 'desc' },
                select: { totalNet: true }
            });
            payrollTotal = Number(latestRun?.totalNet) || 0;
        }

        // Attendance rate: real clock-ins vs expected (employees * 22 working days/month)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const clockIns = await prisma.attendanceLog.count({
            where: {
                organizationId,
                clockIn: { gte: thirtyDaysAgo },
                ...(isExecutive ? {} : { employeeId: { in: employeeIds } })
            }
        });
        const expectedDays = totalEmployees * 22;
        const attendanceRate = expectedDays > 0
            ? Math.min(100, Math.round((clockIns / expectedDays) * 100 * 10) / 10)
            : 0;

        // Team Performance (Average of current team's latest locked sheet)
        const lockedSheets = await prisma.kpiSheet.groupBy({
            by: ['employeeId'],
            where: { 
                organizationId, 
                status: { in: ['LOCKED', 'SUBMITTED'] },
                ...(isExecutive ? {} : { employeeId: { in: employeeIds } })
            },
            _avg: { totalScore: true }
        });
        const avgScores = lockedSheets.map(s => Number(s._avg.totalScore) || 0);
        const teamPerf = avgScores.length ? avgScores.reduce((a, b) => a + b, 0) / avgScores.length : 0;

        // Growth: real headcount per month (last 7 months) - Executives only
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const growth = isExecutive ? await Promise.all(
            Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return prisma.user.count({
                    where: { organizationId, status: { not: 'TERMINATED' }, joinDate: { lte: end }, role: { not: 'DEV' } }
                }).then(value => ({ name: monthNames[d.getMonth()], value }));
            })
        ) : [];

        res.json({ 
            totalEmployees, 
            activeLeaves, 
            pendingTasks: pendingLeaves + pendingKpis + pendingAppraisals, 
            pendingLeaves,
            pendingKpis,
            draftKpis,
            pendingAppraisals,
            activeDepts,
            openJobs,
            payrollTotal, 
            attendanceRate, 
            growth,
            teamPerf
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getDepartmentGrowth = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'default-tenant';

        const departments = await prisma.department.findMany({
            where: { organizationId },
            include: { 
                employees: {
                    select: { id: true }
                }
            }
        });

        const performance = await Promise.all(departments.map(async d => {
            const empIds = d.employees.map(e => e.id);
            const sheets = await prisma.kpiSheet.aggregate({
                where: { 
                    employeeId: { in: empIds },
                    organizationId,
                    status: { in: ['LOCKED', 'SUBMITTED', 'ACTIVE'] }
                },
                _avg: { totalScore: true }
            });
            
            return {
                name: d.name,
                employees: d.employees.length,
                value: Math.round(Number(sheets._avg.totalScore) || 50),
            };
        }));

        res.json(performance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getPersonalStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'default-tenant';
        const userId = user.id;

        // 1. Overall Performance (Average of all completed KPI Sheets)
        const sheets = await prisma.kpiSheet.findMany({
            where: { employeeId: userId, organizationId, status: { in: ['LOCKED', 'PENDING_APPROVAL', 'ACTIVE'] } },
            select: { totalScore: true }
        });
        const perfScores = sheets.map(s => Number(s.totalScore) || 0);
        const overallPerformance = perfScores.length ? perfScores.reduce((a, b) => a + b, 0) / perfScores.length : 0;

        // 2. Attendance Rate (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const clockIns = await prisma.attendanceLog.count({
            where: { employeeId: userId, organizationId, clockIn: { gte: thirtyDaysAgo } }
        });
        const expectedDays = 22; // Approx working days in a month
        const attendanceRate = Math.min(100, (clockIns / expectedDays) * 100);

        // 3. Leave Balance
        const userRec = await prisma.user.findFirst({
            where: { id: userId, organizationId },
            select: { leaveBalance: true, leaveAllowance: true, signatureUrl: true, contactNumber: true }
        });

        // 4. My Active Goals (Items from the most recent active/pending sheet)
        const latestSheet = await prisma.kpiSheet.findFirst({
            where: { employeeId: userId, organizationId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            include: { items: true }
        });

        const activeGoals = latestSheet ? latestSheet.items.map(item => ({
            name: item.name || item.description,
            progress: Number(item.targetValue) > 0 ? Math.min(100, Math.round((Number(item.actualValue) / Number(item.targetValue)) * 100)) : 0,
            color: '#6366f1' // Can be dynamic later if needed
        })).slice(0, 4) : []; // Limit to top 4 for dashboard

        // 5. Real Training Status
        const enrollments = await prisma.trainingEnrollment.findMany({
            where: { employeeId: userId, organizationId }
        });
        const completed = enrollments.filter(e => e.status === 'COMPLETED').length;
        const trainingStatus = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 100; // 100% if no enrollments

        // 6. Security Profile
        const securityProfile = {
            signatureUploaded: !!userRec?.signatureUrl,
            identityVerified: !!userRec?.contactNumber, // Updated to match schema
            twoFactorEnabled: false, // Field not in schema yet
            rank: user.rank || 0
        };

        res.json({
            overallPerformance: Math.round(overallPerformance * 10) / 10,
            attendanceRate: Math.round(attendanceRate * 10) / 10,
            leaveBalance: userRec?.leaveBalance || 0,
            leaveAllowance: userRec?.leaveAllowance || 0,
            activeGoals,
            trainingStatus,
            securityProfile
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
