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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid status transitions — only these are legal
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['STAFF_SUBMITTED'],
  STAFF_SUBMITTED: ['MANAGER_REVIEW'],
  MANAGER_REVIEW: ['CALIBRATION_PENDING', 'FINAL_VERDICT'], // calibration optional
  CALIBRATION_PENDING: ['HR_REVIEW', 'FINAL_VERDICT'],
  HR_REVIEW: ['FINAL_VERDICT'],
  FINAL_VERDICT: ['COMPLETED'],
  COMPLETED: [],
};

// Role rank required to action each status transition
const STATUS_ROLE_REQUIREMENT: Record<string, number> = {
  MANAGER_REVIEW: 70,        // Manager
  CALIBRATION_PENDING: 80,   // Director can trigger calibration
  HR_REVIEW: 70,             // HR Manager
  FINAL_VERDICT: 80,         // MD / Director
  COMPLETED: 80,
};

/**
 * Validates whether a status transition is legal.
 */
export const isValidTransition = (from: string, to: string): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
};

/**
 * Get the default approval flow for an organization.
 * If none exists, creates a sensible default.
 */
export const getOrCreateDefaultFlow = async (organizationId: string) => {
  const existing = await prisma.approvalFlow.findFirst({
    where: { organizationId, isDefault: true, isActive: true },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  if (existing) return existing;

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

/**
 * Advance an appraisal through the approval workflow.
 * Validates the transition, records the approval, and updates the appraisal status.
 */
export const advanceAppraisal = async (params: {
  appraisalId: string;
  approverId: string;
  approverRole: string;
  approverRank: number;
  action: 'APPROVED' | 'REJECTED' | 'REQUESTED_CHANGES';
  comment?: string;
  targetStatus: string;
  organizationId: string;
  feedbackNotes?: string; // Written notes for this stage
}) => {
  const { appraisalId, approverId, approverRank, action, comment, targetStatus, organizationId, feedbackNotes } = params;

  const appraisal = await prisma.appraisal.findUnique({ where: { id: appraisalId } });
  if (!appraisal) throw new Error('Appraisal not found');

  // Validate role permission
  const requiredRank = STATUS_ROLE_REQUIREMENT[targetStatus];
  if (requiredRank && approverRank < requiredRank) {
    throw new Error(`Insufficient permissions to transition to ${targetStatus}`);
  }

  // Validate transition legality
  if (!isValidTransition(appraisal.status, targetStatus)) {
    throw new Error(`Invalid status transition: ${appraisal.status} → ${targetStatus}`);
  }

  // Determine which notes field to update based on who is approving
  const notesUpdate: Record<string, string | undefined> = {};
  if (targetStatus === 'MANAGER_REVIEW' || appraisal.status === 'STAFF_SUBMITTED') {
    notesUpdate.managerNotes = feedbackNotes;
    notesUpdate.reviewedAt = new Date().toISOString() as any;
  } else if (targetStatus === 'CALIBRATION_PENDING') {
    notesUpdate.calibrationNotes = feedbackNotes;
    notesUpdate.calibratedAt = new Date().toISOString() as any;
  } else if (targetStatus === 'HR_REVIEW') {
    notesUpdate.hrNotes = feedbackNotes;
    notesUpdate.hrReviewedAt = new Date().toISOString() as any;
  } else if (targetStatus === 'FINAL_VERDICT' || targetStatus === 'COMPLETED') {
    notesUpdate.mdNotes = feedbackNotes;
    notesUpdate.verdictAt = new Date().toISOString() as any;
    if (targetStatus === 'COMPLETED') notesUpdate.completedAt = new Date().toISOString() as any;
  }

  // Find or create the step reference for audit tracking
  const step = await prisma.approvalStep.findFirst({
    where: { organizationId, targetStatus },
  });

  // Atomic transaction: update appraisal + record approval
  return prisma.$transaction(async (tx) => {
    const updatedAppraisal = await tx.appraisal.update({
      where: { id: appraisalId },
      data: { status: targetStatus, ...(notesUpdate as any) },
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

/**
 * Get the full approval history/audit trail for an appraisal.
 */
export const getApprovalHistory = async (appraisalId: string) => {
  return prisma.appraisalApproval.findMany({
    where: { appraisalId },
    include: {
      step: { select: { label: true, stepOrder: true, requiredRole: true } },
    },
    orderBy: { actionedAt: 'asc' },
  });
};

/**
 * Create or update an approval flow for an organization.
 */
export const createApprovalFlow = async (params: {
  organizationId: string;
  name: string;
  description?: string;
  steps: Array<{ stepOrder: number; requiredRole: string; targetStatus: string; label: string; isMandatory?: boolean }>;
}) => {
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
