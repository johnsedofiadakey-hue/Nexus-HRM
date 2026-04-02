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
        // 1. Fetch the 2 latest completed or active cycles to calculate change
        const cycles = await client_1.default.appraisalCycle.findMany({
            where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            orderBy: { createdAt: 'desc' },
            take: 2,
        });
        const currentCycleId = cycles[0]?.id;
        const previousCycleId = cycles[1]?.id;
        // 2. Performance Stats (using finalScore from packets)
        const currentPackets = currentCycleId
            ? await client_1.default.appraisalPacket.findMany({
                where: { cycleId: currentCycleId, finalScore: { not: null } },
                select: { finalScore: true }
            })
            : [];
        const previousPackets = previousCycleId
            ? await client_1.default.appraisalPacket.findMany({
                where: { cycleId: previousCycleId, finalScore: { not: null } },
                select: { finalScore: true }
            })
            : [];
        const currentPerf = currentPackets.length
            ? currentPackets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / currentPackets.length
            : 0;
        const previousPerf = previousPackets.length
            ? previousPackets.reduce((sum, p) => sum + Number(p.finalScore || 0), 0) / previousPackets.length
            : 0;
        // 3. Morale Stats (using overallRating from SELF reviews as a proxy)
        const currentSelfReviews = currentCycleId
            ? await client_1.default.appraisalReview.findMany({
                where: { packet: { cycleId: currentCycleId }, reviewStage: 'SELF', overallRating: { not: null } },
                select: { overallRating: true }
            })
            : [];
        const previousSelfReviews = previousCycleId
            ? await client_1.default.appraisalReview.findMany({
                where: { packet: { cycleId: previousCycleId }, reviewStage: 'SELF', overallRating: { not: null } },
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
        const criticalIssues = await client_1.default.leaveRequest.count({
            where: { organizationId: orgId, status: { in: ['PENDING_RELIEVER', 'PENDING_MANAGER'] }, isArchived: false }
        });
        // 5. Top Performers (Count of packets with score >= 85)
        const topPerformers = currentPackets.filter(p => Number(p.finalScore || 0) >= 85).length;
        res.json({
            avgPerformance: Math.round(currentPerf),
            performanceChange: formatChange(currentPerf, previousPerf),
            teamMorale: Math.round(currentMorale * 10) / 10,
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
        // Fetch last 6 completed cycles for the trend line
        const cycles = await client_1.default.appraisalCycle.findMany({
            where: { organizationId: orgId, status: { in: ['ACTIVE', 'COMPLETED'] } },
            include: {
                _count: { select: { packets: { where: { finalScore: { not: null } } } } },
                packets: {
                    where: { finalScore: { not: null } },
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDashboardPerformance = getDashboardPerformance;
