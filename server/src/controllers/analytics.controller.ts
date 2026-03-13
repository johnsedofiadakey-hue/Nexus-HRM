import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getExecutiveStats = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user.organizationId || 'default-tenant';
        const rank = user.rank || 50;

        const totalEmployees = await prisma.user.count({
            where: { organizationId, status: 'ACTIVE' }
        });

        const activeLeaves = await prisma.leaveRequest.count({
            where: { organizationId, status: 'APPROVED' }
        });

        const pendingTasks = await prisma.leaveRequest.count({
            where: { organizationId, status: 'PENDING' }
        });

        let payrollTotal = 0;
        if (rank >= 80) {
            const activeSalaries = await prisma.user.findMany({
                where: { organizationId, status: 'ACTIVE' },
                select: { salary: true }
            });
            payrollTotal = activeSalaries.reduce((sum, u) => sum + (Number(u.salary) || 0), 0);
        }

        // Attendance rate: real clock-ins vs expected (employees * 22 working days/month)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const clockIns = await prisma.attendanceLog.count({
            where: {
                organizationId,
                clockIn: { gte: thirtyDaysAgo },
            }
        });
        const expectedDays = totalEmployees * 22;
        const attendanceRate = expectedDays > 0
            ? Math.min(100, Math.round((clockIns / expectedDays) * 100 * 10) / 10)
            : 0;

        // Growth: real headcount per month (last 7 months)
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const growth = await Promise.all(
            Array.from({ length: 7 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
                const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                return prisma.user.count({
                    where: {
                        organizationId,
                        status: { not: 'TERMINATED' },
                        joinDate: { lte: end }
                    }
                }).then(value => ({ name: monthNames[d.getMonth()], value }));
            })
        );

        res.json({ totalEmployees, activeLeaves, pendingTasks, payrollTotal, attendanceRate, growth });
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
            include: { _count: { select: { employees: true } } }
        });

        const performance = departments.map(d => ({
            name: d.name,
            employees: d._count.employees,
            value: d._count.employees > 0 ? Math.min(100, 50 + d._count.employees * 5) : 50,
        }));

        res.json(performance);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
