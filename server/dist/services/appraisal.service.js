"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamAppraisals = exports.submitManagerReview = exports.submitSelfRating = exports.getMyAppraisal = exports.initAppraisalCycle = void 0;
const client_1 = __importDefault(require("../prisma/client")); // FIX: Use shared client
const initAppraisalCycle = async (organizationId, cycleId, employeeIds) => {
    const cycle = await client_1.default.cycle.findFirst({
        where: { id: cycleId, organizationId }
    });
    if (!cycle)
        throw new Error('Cycle not found');
    if (cycle.status !== 'ACTIVE')
        throw new Error('Cycle must be ACTIVE to initialize appraisals');
    let employeesToInit = [];
    if (employeeIds && employeeIds.length > 0) {
        employeesToInit = await client_1.default.user.findMany({
            where: {
                id: { in: employeeIds },
                organizationId,
                status: 'ACTIVE'
            }
        });
    }
    else {
        employeesToInit = await client_1.default.user.findMany({
            where: {
                organizationId,
                status: 'ACTIVE'
            }
        });
    }
    // 1. Fetch competencies once, seed if empty
    let competencies = await client_1.default.competency.findMany({
        where: { organizationId }
    });
    if (competencies.length === 0) {
        console.log('Seeding default competencies for organization:', organizationId);
        const defaults = [
            { name: 'Core Performance', description: 'Overall job performance and quality of work', weight: 40 },
            { name: 'Punctuality & Reliability', description: 'Attendance, deadliness, and reliability', weight: 20 },
            { name: 'Teamwork & Communication', description: 'Collaboration with colleagues and clear communication', weight: 20 },
            { name: 'Professional Growth', description: 'Learning new skills and taking initiative', weight: 20 }
        ];
        await client_1.default.competency.createMany({
            data: defaults.map(d => ({ ...d, organizationId }))
        });
        competencies = await client_1.default.competency.findMany({
            where: { organizationId }
        });
    }
    // 2. Find MD as fallback for missing supervisors
    const mdUser = await client_1.default.user.findFirst({
        where: { organizationId, role: 'MD' },
        select: { id: true }
    });
    // 3. Fetch existing appraisals to avoid duplicates
    const existingAppraisals = await client_1.default.appraisal.findMany({
        where: { cycleId, organizationId },
        select: { employeeId: true }
    });
    const existingEmpIds = new Set(existingAppraisals.map(a => a.employeeId));
    const results = [];
    // 4. Process in chunks or parallelize cautiously
    for (const emp of employeesToInit) {
        if (existingEmpIds.has(emp.id))
            continue;
        // Fallback to MD if no supervisor
        const reviewerId = emp.supervisorId || mdUser?.id;
        if (!reviewerId) {
            console.log(`Skipping appraisal for ${emp.fullName} - No supervisor or MD found.`);
            continue;
        }
        const appraisal = await client_1.default.appraisal.create({
            data: {
                organizationId,
                employeeId: emp.id,
                cycleId,
                reviewerId,
                status: 'PENDING_SELF'
            }
        });
        if (competencies.length > 0) {
            await client_1.default.appraisalRating.createMany({
                data: competencies.map(comp => ({
                    organizationId,
                    appraisalId: appraisal.id,
                    competencyId: comp.id
                }))
            });
        }
        results.push(appraisal);
    }
    return results;
};
exports.initAppraisalCycle = initAppraisalCycle;
const getMyAppraisal = async (organizationId, userId, cycleId) => {
    if (cycleId) {
        return client_1.default.appraisal.findFirst({
            where: {
                employeeId: userId,
                cycleId,
                organizationId
            },
            include: { ratings: { include: { competency: true } }, reviewer: true, cycle: true }
        });
    }
    return client_1.default.appraisal.findFirst({
        where: {
            employeeId: userId,
            organizationId
        },
        orderBy: { createdAt: 'desc' },
        include: { ratings: { include: { competency: true } }, reviewer: true, cycle: true }
    });
};
exports.getMyAppraisal = getMyAppraisal;
const submitSelfRating = async (organizationId, userId, appraisalId, ratings) => {
    const appraisal = await client_1.default.appraisal.findFirst({
        where: { id: appraisalId, organizationId }
    });
    if (!appraisal)
        throw new Error('Appraisal not found');
    if (appraisal.employeeId !== userId)
        throw new Error('Unauthorized');
    if (appraisal.status !== 'PENDING_SELF')
        throw new Error('Self-review already submitted or locked');
    for (const r of ratings) {
        if (r.score < 1 || r.score > 5)
            throw new Error(`Score must be between 1 and 5 for competency ${r.competencyId}`);
        await client_1.default.appraisalRating.upsert({
            where: {
                appraisalId_competencyId: { appraisalId, competencyId: r.competencyId }
            },
            update: { selfScore: r.score, selfComment: r.comment },
            create: {
                organizationId,
                appraisalId,
                competencyId: r.competencyId,
                selfScore: r.score,
                selfComment: r.comment
            }
        });
    }
    return client_1.default.appraisal.update({
        where: { id: appraisalId },
        data: { status: 'PENDING_MANAGER' }
    });
};
exports.submitSelfRating = submitSelfRating;
const submitManagerReview = async (organizationId, reviewerId, appraisalId, ratings) => {
    const appraisal = await client_1.default.appraisal.findFirst({
        where: { id: appraisalId, organizationId }
    });
    if (!appraisal)
        throw new Error('Appraisal not found');
    if (appraisal.reviewerId !== reviewerId)
        throw new Error('Unauthorized: Not the reviewer');
    if (appraisal.status !== 'PENDING_MANAGER')
        throw new Error('Waiting for employee self-evaluation');
    // Weighted scoring using competency weights
    let weightedTotal = 0;
    let totalWeight = 0;
    for (const r of ratings) {
        if (r.score < 1 || r.score > 5)
            throw new Error(`Score must be between 1 and 5`);
        const competency = await client_1.default.competency.findFirst({
            where: { id: r.competencyId, organizationId }
        });
        const weight = competency?.weight || 1;
        await client_1.default.appraisalRating.upsert({
            where: { appraisalId_competencyId: { appraisalId, competencyId: r.competencyId } },
            update: { managerScore: r.score, managerComment: r.comment },
            create: {
                organizationId,
                appraisalId,
                competencyId: r.competencyId,
                managerScore: r.score,
                managerComment: r.comment
            }
        });
        weightedTotal += r.score * weight;
        totalWeight += weight;
    }
    const finalScore = totalWeight > 0 ? (weightedTotal / totalWeight) * 20 : 0; // Scale to 100
    return client_1.default.appraisal.update({
        where: { id: appraisalId },
        data: { status: 'COMPLETED', finalScore: Math.round(finalScore * 10) / 10 }
    });
};
exports.submitManagerReview = submitManagerReview;
const getTeamAppraisals = async (organizationId, managerId, role) => {
    const whereClause = (role === 'MD' || role === 'DIRECTOR') ? {} : { reviewerId: managerId };
    whereClause.organizationId = organizationId;
    return client_1.default.appraisal.findMany({
        where: whereClause,
        include: {
            employee: { select: { id: true, fullName: true, position: true, avatarUrl: true } },
            cycle: { select: { name: true, endDate: true } },
            ratings: { include: { competency: true } }
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: 50
    });
};
exports.getTeamAppraisals = getTeamAppraisals;
