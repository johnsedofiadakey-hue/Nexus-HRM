"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAppraisalsByCycle = exports.deleteAppraisal = exports.getCycleStats = exports.getManagerOwnAppraisal = exports.getAppraisalDetail = exports.getAwaitingVerdictAppraisals = exports.getTeamAppraisals = exports.submitFinalVerdict = exports.submitManagerReview = exports.submitSelfRating = exports.getMyAppraisal = exports.initAppraisalCycle = void 0;
/**
 * Appraisal Service — Hierarchy-Aware Review Chain
 *
 * FLOW:
 * 1. Init: Create one Appraisal per eligible employee, resolver finds their primary reviewer
 *    via EmployeeReporting (primary DIRECT manager), falling back to supervisorId, then MD.
 *
 * 2. Staff does self-assessment → status: DRAFT → STAFF_SUBMITTED
 *
 * 3. Line Manager reviews staff → calculates weighted score.
 *    Then checks if the MANAGER themselves has an appraisal in progress
 *    (managers are also employees and have their own chain).
 *    Status moves to MANAGER_REVIEW → FINAL_VERDICT (if reviewer is Director/MD)
 *    or → MANAGER_REVIEW (passes up to the manager's manager).
 *
 * 4. Director/MD provides final verdict → COMPLETED
 *
 * Multi-manager aware: resolveReviewer() queries EmployeeReporting first,
 * then falls back to supervisorId, then falls back to MD.
 */
const client_1 = __importDefault(require("../prisma/client"));
// ─── Reviewer Resolution ──────────────────────────────────────────────────────
/**
 * Find the primary reviewer for an employee.
 * Priority: EmployeeReporting (primary DIRECT) → supervisorId → MD fallback
 */
const resolveReviewer = async (employeeId, organizationId, mdUserId) => {
    // 1. Try EmployeeReporting (the new, preferred source of truth)
    const primaryReporting = await client_1.default.employeeReporting.findFirst({
        where: {
            employeeId,
            organizationId,
            type: 'DIRECT',
            isPrimary: true,
            effectiveTo: null,
        },
        select: { managerId: true },
    });
    if (primaryReporting)
        return primaryReporting.managerId;
    // 2. Try any DIRECT reporting line (non-primary)
    const anyDirect = await client_1.default.employeeReporting.findFirst({
        where: { employeeId, organizationId, type: 'DIRECT', effectiveTo: null },
        select: { managerId: true },
    });
    if (anyDirect)
        return anyDirect.managerId;
    // 3. Legacy fallback: supervisorId on User record
    const employee = await client_1.default.user.findUnique({
        where: { id: employeeId },
        select: { supervisorId: true },
    });
    if (employee?.supervisorId)
        return employee.supervisorId;
    // 4. Last resort: MD as blanket reviewer
    return mdUserId || null;
};
/**
 * Determine the rank of a role for approval gating.
 */
const getRoleRank = (role) => {
    const ranks = {
        STAFF: 10, CASUAL: 10, INTERN: 10,
        SUPERVISOR: 40,
        MANAGER: 60, HR_MANAGER: 60,
        DIRECTOR: 80,
        MD: 100,
        DEV: 999,
    };
    return ranks[role] ?? 10;
};
const EXCLUDED_ROLES = new Set(['MD', 'DEV', 'DIRECTOR']); // These roles have their own init logic
// ─── INIT CYCLE ───────────────────────────────────────────────────────────────
/**
 * Initialise appraisals for all eligible employees in a cycle.
 *
 * Eligible = ACTIVE, not archived, role NOT in EXCLUDED_ROLES (MD/DEV don't get staff appraisals).
 * Managers ARE included — they have their own appraisal that their Director/MD reviews.
 */
const initAppraisalCycle = async (organizationId, cycleId, employeeIds) => {
    // --- Validate cycle
    const cycle = await client_1.default.cycle.findFirst({
        where: { id: cycleId, organizationId },
    });
    if (!cycle)
        throw new Error(`Cycle not found (id: ${cycleId}). Ensure an ACTIVE cycle exists.`);
    if (cycle.status !== 'ACTIVE')
        throw new Error(`Cycle "${cycle.name}" must be ACTIVE to initialize appraisals. Current status: ${cycle.status}`);
    // --- Build the employee query
    const baseWhere = {
        organizationId,
        isArchived: false,
        // Include ALL active statuses — the DB may store 'ACTIVE', 'active', etc.
        // We filter EXCLUDED_ROLES separately below
    };
    if (employeeIds && employeeIds.length > 0) {
        baseWhere.id = { in: employeeIds };
    }
    let employeesToInit = await client_1.default.user.findMany({ where: baseWhere });
    // Filter out system/executive roles who aren't appraised this way
    employeesToInit = employeesToInit.filter((u) => !EXCLUDED_ROLES.has(u.role) && u.status?.toUpperCase() !== 'INACTIVE');
    if (employeesToInit.length === 0) {
        throw new Error('No eligible employees found. Ensure employees are added and not archived. ' +
            'MD, Director, and DEV accounts are excluded from standard appraisal initiation.');
    }
    // --- Seed default competencies if none exist
    let competencies = await client_1.default.competency.findMany({ where: { organizationId } });
    if (competencies.length === 0) {
        await client_1.default.competency.createMany({
            data: [
                { organizationId, name: 'Core Performance', description: 'Overall job performance and quality of work', weight: 40 },
                { organizationId, name: 'Punctuality & Reliability', description: 'Attendance, deadlines, and reliability', weight: 20 },
                { organizationId, name: 'Teamwork & Communication', description: 'Collaboration and clear communication', weight: 20 },
                { organizationId, name: 'Professional Growth', description: 'Learning new skills and taking initiative', weight: 20 },
            ],
        });
        competencies = await client_1.default.competency.findMany({ where: { organizationId } });
    }
    // --- Find MD as final fallback reviewer
    const mdUser = await client_1.default.user.findFirst({
        where: { organizationId, role: 'MD' },
        select: { id: true },
    });
    // --- Avoid duplicates
    const existing = await client_1.default.appraisal.findMany({
        where: { cycleId, organizationId },
        select: { employeeId: true },
    });
    const existingIds = new Set(existing.map((a) => a.employeeId));
    // --- Create appraisals
    const results = [];
    const skipped = [];
    for (const emp of employeesToInit) {
        if (existingIds.has(emp.id))
            continue;
        const reviewerId = await resolveReviewer(emp.id, organizationId, mdUser?.id);
        if (!reviewerId) {
            skipped.push(emp.fullName);
            continue;
        }
        const appraisal = await client_1.default.appraisal.create({
            data: {
                organizationId,
                employeeId: emp.id,
                cycleId,
                reviewerId,
                status: 'DRAFT',
            },
        });
        // Create rating slots
        if (competencies.length > 0) {
            await client_1.default.appraisalRating.createMany({
                data: competencies.map((comp) => ({
                    organizationId,
                    appraisalId: appraisal.id,
                    competencyId: comp.id,
                })),
            });
        }
        results.push({
            ...appraisal,
            employeeName: emp.fullName,
            reviewerId,
        });
    }
    return {
        initiated: results.length,
        skipped: skipped.length,
        skippedNames: skipped,
        appraisals: results,
    };
};
exports.initAppraisalCycle = initAppraisalCycle;
// ─── STAFF: SELF ASSESSMENT ───────────────────────────────────────────────────
const getMyAppraisal = async (organizationId, userId, cycleId) => {
    const where = { employeeId: userId, organizationId };
    if (cycleId)
        where.cycleId = cycleId;
    return client_1.default.appraisal.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            ratings: { include: { competency: true } },
            reviewer: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
            cycle: true,
        },
    });
};
exports.getMyAppraisal = getMyAppraisal;
const submitSelfRating = async (organizationId, userId, appraisalId, ratings, selfNotes) => {
    const appraisal = await client_1.default.appraisal.findFirst({ where: { id: appraisalId, organizationId } });
    if (!appraisal)
        throw new Error('Appraisal not found');
    if (appraisal.employeeId !== userId)
        throw new Error('Unauthorized: This is not your appraisal');
    if (!['DRAFT', 'REQUESTED_CHANGES'].includes(appraisal.status)) {
        throw new Error('Self-review already submitted or locked. Status: ' + appraisal.status);
    }
    for (const r of ratings) {
        if (r.score < 1 || r.score > 5)
            throw new Error(`Score must be 1-5 for competency ${r.competencyId}`);
        await client_1.default.appraisalRating.upsert({
            where: { appraisalId_competencyId: { appraisalId, competencyId: r.competencyId } },
            update: { selfScore: r.score, selfComment: r.comment },
            create: { organizationId, appraisalId, competencyId: r.competencyId, selfScore: r.score, selfComment: r.comment },
        });
    }
    return client_1.default.appraisal.update({
        where: { id: appraisalId },
        data: { status: 'STAFF_SUBMITTED', submittedAt: new Date(), staffNotes: selfNotes },
    });
};
exports.submitSelfRating = submitSelfRating;
// ─── MANAGER: REVIEW TEAM MEMBER ─────────────────────────────────────────────
/**
 * Manager reviews a team member's appraisal.
 * After completing the review, determines if this goes to FINAL_VERDICT (Director/MD reviewing)
 * or if the manager themselves needs to be reviewed upstream first.
 */
const submitManagerReview = async (organizationId, reviewerId, appraisalId, ratings, managerNotes) => {
    const appraisal = await client_1.default.appraisal.findFirst({
        where: { id: appraisalId, organizationId },
        include: { employee: { select: { id: true, fullName: true } } },
    });
    if (!appraisal)
        throw new Error('Appraisal not found');
    if (appraisal.reviewerId !== reviewerId)
        throw new Error('Unauthorized: You are not the assigned reviewer');
    if (!['STAFF_SUBMITTED', 'DRAFT', 'MANAGER_REVIEW'].includes(appraisal.status)) {
        throw new Error('Appraisal cannot be reviewed at this stage. Status: ' + appraisal.status);
    }
    // Calculate weighted score
    let weightedTotal = 0;
    let totalWeight = 0;
    for (const r of ratings) {
        if (r.score < 1 || r.score > 5)
            throw new Error('Score must be between 1 and 5');
        const competency = await client_1.default.competency.findFirst({ where: { id: r.competencyId, organizationId } });
        const weight = competency?.weight || 1;
        await client_1.default.appraisalRating.upsert({
            where: { appraisalId_competencyId: { appraisalId, competencyId: r.competencyId } },
            update: { managerScore: r.score, managerComment: r.comment },
            create: { organizationId, appraisalId, competencyId: r.competencyId, managerScore: r.score, managerComment: r.comment },
        });
        weightedTotal += r.score * weight;
        totalWeight += weight;
    }
    const finalScore = totalWeight > 0 ? Math.round(((weightedTotal / totalWeight) * 20) * 10) / 10 : 0;
    // Determine the reviewer's own role rank
    const reviewer = await client_1.default.user.findUnique({
        where: { id: reviewerId },
        select: { role: true },
    });
    const reviewerRank = getRoleRank(reviewer?.role || 'STAFF');
    // If reviewed by a Director or MD, this goes straight to FINAL_VERDICT
    const nextStatus = reviewerRank >= 80 ? 'FINAL_VERDICT' : 'FINAL_VERDICT';
    // NOTE: In the current flow, manager review always advances to FINAL_VERDICT.
    // For calibration, an org can enable the CALIBRATION_PENDING stage via the approval engine.
    return client_1.default.appraisal.update({
        where: { id: appraisalId },
        data: {
            status: nextStatus,
            finalScore,
            reviewedAt: new Date(),
            managerNotes: managerNotes || null,
        },
    });
};
exports.submitManagerReview = submitManagerReview;
// ─── MD/DIRECTOR: FINAL VERDICT ───────────────────────────────────────────────
const submitFinalVerdict = async (organizationId, userId, appraisalId, mdNotes) => {
    const appraisal = await client_1.default.appraisal.findFirst({ where: { id: appraisalId, organizationId } });
    if (!appraisal)
        throw new Error('Appraisal not found');
    if (!['FINAL_VERDICT', 'AWAITING_FINAL_VERDICT'].includes(appraisal.status)) {
        throw new Error(`Appraisal is not yet ready for final verdict (status: ${appraisal.status})`);
    }
    const user = await client_1.default.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (getRoleRank(user?.role || '') < 80)
        throw new Error('Only Directors and MDs can issue a final verdict');
    return client_1.default.appraisal.update({
        where: { id: appraisalId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            verdictAt: new Date(),
            mdNotes: mdNotes || null,
        },
    });
};
exports.submitFinalVerdict = submitFinalVerdict;
// ─── QUERIES ──────────────────────────────────────────────────────────────────
const getTeamAppraisals = async (organizationId, managerId) => {
    // Also include appraisals of people who report to this manager via EmployeeReporting
    const reportingEmployeeIds = await client_1.default.employeeReporting.findMany({
        where: { managerId, organizationId, effectiveTo: null },
        select: { employeeId: true },
    });
    const directReportIds = reportingEmployeeIds.map((r) => r.employeeId);
    // Combine: appraisals where reviewerId=this manager OR employee is in their reporting line
    const appraisals = await client_1.default.appraisal.findMany({
        where: {
            organizationId,
            OR: [
                { reviewerId: managerId },
                { employeeId: { in: directReportIds } },
            ],
        },
        include: {
            employee: { select: { id: true, fullName: true, position: true, jobTitle: true, avatarUrl: true, role: true } },
            reviewer: { select: { id: true, fullName: true, role: true } },
            cycle: { select: { name: true, endDate: true } },
            ratings: { include: { competency: true } },
            approvals: { include: { step: { select: { label: true } } }, orderBy: { actionedAt: 'asc' } },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        take: 100,
    });
    // Deduplicate
    const seen = new Set();
    return appraisals.filter((a) => {
        if (seen.has(a.id))
            return false;
        seen.add(a.id);
        return true;
    });
};
exports.getTeamAppraisals = getTeamAppraisals;
const getAwaitingVerdictAppraisals = async (organizationId) => {
    return client_1.default.appraisal.findMany({
        where: {
            organizationId,
            status: { in: ['FINAL_VERDICT', 'AWAITING_FINAL_VERDICT'] },
        },
        include: {
            employee: { select: { id: true, fullName: true, position: true, jobTitle: true, avatarUrl: true } },
            reviewer: { select: { id: true, fullName: true, role: true } },
            cycle: { select: { name: true, endDate: true } },
            ratings: { include: { competency: true } },
            approvals: { include: { step: { select: { label: true } } }, orderBy: { actionedAt: 'asc' } },
        },
        orderBy: [{ updatedAt: 'desc' }],
    });
};
exports.getAwaitingVerdictAppraisals = getAwaitingVerdictAppraisals;
const getAppraisalDetail = async (organizationId, appraisalId) => {
    return client_1.default.appraisal.findFirst({
        where: { id: appraisalId, organizationId },
        include: {
            employee: { select: { id: true, fullName: true, position: true, jobTitle: true, avatarUrl: true } },
            reviewer: { select: { id: true, fullName: true, role: true } },
            cycle: true,
            ratings: { include: { competency: true } },
            approvals: { include: { step: true }, orderBy: { actionedAt: 'asc' } },
        },
    });
};
exports.getAppraisalDetail = getAppraisalDetail;
// ─── MANAGER SELF-APPRAISAL ───────────────────────────────────────────────────
/**
 * Check if a manager has their own appraisal in the current cycle.
 * Managers are also employees and go through the same chain upward.
 */
const getManagerOwnAppraisal = async (organizationId, managerId, cycleId) => {
    const where = { employeeId: managerId, organizationId };
    if (cycleId)
        where.cycleId = cycleId;
    return client_1.default.appraisal.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            ratings: { include: { competency: true } },
            reviewer: { select: { id: true, fullName: true, role: true } },
            cycle: true,
        },
    });
};
exports.getManagerOwnAppraisal = getManagerOwnAppraisal;
// ─── STATS / DASHBOARD ────────────────────────────────────────────────────────
const getCycleStats = async (organizationId, cycleId) => {
    const all = await client_1.default.appraisal.findMany({
        where: { organizationId, cycleId },
        select: { status: true, finalScore: true },
    });
    const stats = {
        total: all.length,
        draft: 0,
        submitted: 0,
        inReview: 0,
        pendingVerdict: 0,
        completed: 0,
        avgScore: 0,
    };
    let scoreSum = 0;
    let scoreCount = 0;
    for (const a of all) {
        switch (a.status) {
            case 'DRAFT':
                stats.draft++;
                break;
            case 'STAFF_SUBMITTED':
                stats.submitted++;
                break;
            case 'MANAGER_REVIEW':
                stats.inReview++;
                break;
            case 'FINAL_VERDICT':
            case 'AWAITING_FINAL_VERDICT':
                stats.pendingVerdict++;
                break;
            case 'COMPLETED':
                stats.completed++;
                break;
        }
        if (a.finalScore != null) {
            scoreSum += a.finalScore;
            scoreCount++;
        }
    }
    stats.avgScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;
    return stats;
};
exports.getCycleStats = getCycleStats;
// ─── DELETE ──────────────────────────────────────────────────────────────────
const deleteAppraisal = async (organizationId, appraisalId) => {
    // Cascading deletes for ratings and approvals are handled by Prisma if defined in schema,
    // but let's be explicit if needed.
    await client_1.default.appraisalRating.deleteMany({ where: { appraisalId } });
    await client_1.default.appraisalApproval.deleteMany({ where: { appraisalId } });
    return client_1.default.appraisal.delete({
        where: { id: appraisalId, organizationId },
    });
};
exports.deleteAppraisal = deleteAppraisal;
const deleteAppraisalsByCycle = async (organizationId, cycleId) => {
    const appraisals = await client_1.default.appraisal.findMany({
        where: { cycleId, organizationId },
        select: { id: true },
    });
    const ids = appraisals.map((a) => a.id);
    await client_1.default.appraisalRating.deleteMany({ where: { appraisalId: { in: ids } } });
    await client_1.default.appraisalApproval.deleteMany({ where: { appraisalId: { in: ids } } });
    return client_1.default.appraisal.deleteMany({
        where: { cycleId, organizationId },
    });
};
exports.deleteAppraisalsByCycle = deleteAppraisalsByCycle;
