"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardPerformance = exports.getDashboardStats = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const formatChange = (current, previous) => {
    if (!previous)
        return '0%';
    const delta = ((current - previous) / Math.abs(previous)) * 100;
    const rounded = Math.round(delta * 10) / 10;
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
};
const monthLabel = (year, month) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('en-US', { month: 'short' });
};
const getDashboardStats = async (req, res) => {
    try {
        const orgId = (req.user?.organizationId) || 'default-tenant';
        // Optimized: Only fetch the latest performance score per user using a more targeted query
        const latestKpis = await client_1.default.kpiSheet.findMany({
            where: {
                organizationId: orgId,
                totalScore: { not: null },
                employeeId: { not: null },
                employee: { role: { not: 'DEV' } }
            },
            distinct: ['employeeId'],
            orderBy: { employeeId: 'asc', createdAt: 'desc' },
            select: { totalScore: true }
        });
        const avgPerformance = latestKpis.length
            ? latestKpis.reduce((sum, k) => sum + (Number(k.totalScore) || 0), 0) / latestKpis.length
            : 0;
        const latestScores = latestKpis.map(k => Number(k.totalScore) || 0);
        const groupedScores = await client_1.default.kpiSheet.groupBy({
            by: ['year', 'month'],
            where: { organizationId: orgId },
            _avg: { totalScore: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 2
        });
        const currentPerf = groupedScores[0]?._avg.totalScore ?? 0;
        const previousPerf = groupedScores[1]?._avg.totalScore ?? 0;
        /* TODO: V3 - Update morale calculation to use AppraisalPacket/Review
        const appraisals = await (prisma as any).appraisalPacket.findMany({
          where: { organizationId: orgId, status: 'COMPLETED' },
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' }
        });
        */
        const avgMorale = avgPerformance;
        const currentMorale = avgPerformance;
        const previousMorale = avgPerformance;
        const criticalIssues = await client_1.default.leaveRequest.count({
            where: { organizationId: orgId, status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] } }
        });
        const topPerformers = latestScores.filter((score) => score >= 85).length;
        res.json({
            avgPerformance: Math.round(Number(avgPerformance)),
            performanceChange: formatChange(Number(currentPerf), Number(previousPerf)),
            teamMorale: Math.round(Number(avgMorale) * 10) / 10,
            moraleChange: formatChange(Number(currentMorale), Number(previousMorale)),
            criticalIssues,
            topPerformers
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
const getDashboardPerformance = async (req, res) => {
    try {
        const orgId = (req.user?.organizationId) || 'default-tenant';
        const grouped = await client_1.default.kpiSheet.groupBy({
            by: ['year', 'month'],
            where: { organizationId: orgId },
            _avg: { totalScore: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 6
        });
        const data = grouped
            .map((item) => ({
            name: monthLabel(item.year, item.month),
            score: clamp(Math.round((Number(item._avg.totalScore) ?? 0) * 10) / 10),
            target: 80
        }))
            .reverse();
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboardPerformance = getDashboardPerformance;
