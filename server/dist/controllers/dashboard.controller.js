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
            ? latestKpis.reduce((sum, k) => sum + (k.totalScore || 0), 0) / latestKpis.length
            : 0;
        const latestScores = latestKpis.map(k => k.totalScore || 0);
        const groupedScores = await client_1.default.kpiSheet.groupBy({
            by: ['year', 'month'],
            where: { organizationId: orgId },
            _avg: { totalScore: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 2
        });
        const currentPerf = groupedScores[0]?._avg.totalScore ?? 0;
        const previousPerf = groupedScores[1]?._avg.totalScore ?? 0;
        const appraisals = await client_1.default.appraisal.findMany({
            where: { organizationId: orgId, finalScore: { not: null } },
            select: { finalScore: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        const avgMorale = appraisals.length
            ? appraisals.reduce((sum, appraisal) => sum + (appraisal.finalScore ?? 0), 0) / appraisals.length
            : avgPerformance;
        const moraleGrouped = {};
        for (const appraisal of appraisals) {
            const key = `${appraisal.createdAt.getFullYear()}-${appraisal.createdAt.getMonth() + 1}`;
            if (!moraleGrouped[key])
                moraleGrouped[key] = [];
            moraleGrouped[key].push(appraisal.finalScore ?? 0);
        }
        const moraleKeys = Object.keys(moraleGrouped).sort().reverse();
        const currentMorale = moraleKeys[0]
            ? moraleGrouped[moraleKeys[0]].reduce((sum, val) => sum + val, 0) / moraleGrouped[moraleKeys[0]].length
            : avgMorale;
        const previousMorale = moraleKeys[1]
            ? moraleGrouped[moraleKeys[1]].reduce((sum, val) => sum + val, 0) / moraleGrouped[moraleKeys[1]].length
            : currentMorale;
        const criticalIssues = await client_1.default.leaveRequest.count({
            where: { organizationId: orgId, status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] } }
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
            score: clamp(Math.round((item._avg.totalScore ?? 0) * 10) / 10),
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
