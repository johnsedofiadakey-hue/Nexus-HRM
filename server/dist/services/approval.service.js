"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApprovalFlow = exports.getApprovalHistory = exports.advanceAppraisal = exports.getOrCreateDefaultFlow = exports.isValidTransition = void 0;
/**
 * Approval Service — Phase 3: Dynamic Approval Engine
 *
 * Provides a configurable, multi-step approval workflow for appraisals.
 * Each organization defines its own approval chain. Steps are ordered and
 * role-gated to prevent unauthorized transitions.
 *
 * Default Flow (if no custom flow exists):
 * Staff → MANAGER_REVIEW → FINAL_VERDICT → COMPLETED
 */
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Valid status transitions — only these are legal
const VALID_TRANSITIONS = {
    DRAFT: ['STAFF_SUBMITTED'],
    STAFF_SUBMITTED: ['MANAGER_REVIEW'],
    MANAGER_REVIEW: ['CALIBRATION_PENDING', 'FINAL_VERDICT'], // calibration optional
    CALIBRATION_PENDING: ['HR_REVIEW', 'FINAL_VERDICT'],
    HR_REVIEW: ['FINAL_VERDICT'],
    FINAL_VERDICT: ['COMPLETED'],
    COMPLETED: [],
};
// Role rank required to action each status transition
const STATUS_ROLE_REQUIREMENT = {
    MANAGER_REVIEW: 70, // Manager
    CALIBRATION_PENDING: 80, // Director can trigger calibration
    HR_REVIEW: 70, // HR Manager
    FINAL_VERDICT: 80, // MD / Director
    COMPLETED: 80,
};
/**
 * Validates whether a status transition is legal.
 */
const isValidTransition = (from, to) => {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
};
exports.isValidTransition = isValidTransition;
/**
 * Get the default approval flow for an organization.
 * If none exists, creates a sensible default.
 */
const getOrCreateDefaultFlow = async (organizationId) => {
    const existing = await prisma.approvalFlow.findFirst({
        where: { organizationId, isDefault: true, isActive: true },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (existing)
        return existing;
    // Create the default 3-step flow
    return prisma.approvalFlow.create({
        data: {
            organizationId,
            name: 'Standard Performance Review',
            description: 'Default 3-step appraisal approval: Staff → Manager → MD',
            isDefault: true,
            isActive: true,
            steps: {
                create: [
                    { stepOrder: 1, requiredRole: 'MANAGER', targetStatus: 'MANAGER_REVIEW', label: 'Manager Review', isMandatory: true, organizationId },
                    { stepOrder: 2, requiredRole: 'MD', targetStatus: 'FINAL_VERDICT', label: 'Executive Sign-off', isMandatory: true, organizationId },
                ],
            },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
};
exports.getOrCreateDefaultFlow = getOrCreateDefaultFlow;
/**
 * Advance an appraisal through the approval workflow.
 * Validates the transition, records the approval, and updates the appraisal status.
 */
const advanceAppraisal = async (params) => {
    const { appraisalId, approverId, approverRank, action, comment, targetStatus, organizationId, feedbackNotes } = params;
    const appraisal = await prisma.appraisal.findUnique({ where: { id: appraisalId } });
    if (!appraisal)
        throw new Error('Appraisal not found');
    // Validate role permission
    const requiredRank = STATUS_ROLE_REQUIREMENT[targetStatus];
    if (requiredRank && approverRank < requiredRank) {
        throw new Error(`Insufficient permissions to transition to ${targetStatus}`);
    }
    // Validate transition legality
    if (!(0, exports.isValidTransition)(appraisal.status, targetStatus)) {
        throw new Error(`Invalid status transition: ${appraisal.status} → ${targetStatus}`);
    }
    // Determine which notes field to update based on who is approving
    const notesUpdate = {};
    if (targetStatus === 'MANAGER_REVIEW' || appraisal.status === 'STAFF_SUBMITTED') {
        notesUpdate.managerNotes = feedbackNotes;
        notesUpdate.reviewedAt = new Date().toISOString();
    }
    else if (targetStatus === 'CALIBRATION_PENDING') {
        notesUpdate.calibrationNotes = feedbackNotes;
        notesUpdate.calibratedAt = new Date().toISOString();
    }
    else if (targetStatus === 'HR_REVIEW') {
        notesUpdate.hrNotes = feedbackNotes;
        notesUpdate.hrReviewedAt = new Date().toISOString();
    }
    else if (targetStatus === 'FINAL_VERDICT' || targetStatus === 'COMPLETED') {
        notesUpdate.mdNotes = feedbackNotes;
        notesUpdate.verdictAt = new Date().toISOString();
        if (targetStatus === 'COMPLETED')
            notesUpdate.completedAt = new Date().toISOString();
    }
    // Find or create the step reference for audit tracking
    const step = await prisma.approvalStep.findFirst({
        where: { organizationId, targetStatus },
    });
    // Atomic transaction: update appraisal + record approval
    return prisma.$transaction(async (tx) => {
        const updatedAppraisal = await tx.appraisal.update({
            where: { id: appraisalId },
            data: { status: targetStatus, ...notesUpdate },
        });
        if (step) {
            await tx.appraisalApproval.create({
                data: {
                    organizationId,
                    appraisalId,
                    stepId: step.id,
                    approverId,
                    action,
                    comment,
                },
            });
        }
        return updatedAppraisal;
    });
};
exports.advanceAppraisal = advanceAppraisal;
/**
 * Get the full approval history/audit trail for an appraisal.
 */
const getApprovalHistory = async (appraisalId) => {
    return prisma.appraisalApproval.findMany({
        where: { appraisalId },
        include: {
            step: { select: { label: true, stepOrder: true, requiredRole: true } },
        },
        orderBy: { actionedAt: 'asc' },
    });
};
exports.getApprovalHistory = getApprovalHistory;
/**
 * Create or update an approval flow for an organization.
 */
const createApprovalFlow = async (params) => {
    const { organizationId, name, description, steps } = params;
    // Deactivate any current default
    await prisma.approvalFlow.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
    });
    return prisma.approvalFlow.create({
        data: {
            organizationId,
            name,
            description,
            isDefault: true,
            isActive: true,
            steps: {
                create: steps.map((s) => ({ ...s, organizationId })),
            },
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
};
exports.createApprovalFlow = createApprovalFlow;
