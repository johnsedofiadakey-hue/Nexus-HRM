"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppraisalService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
/**
 * Appraisal stages in sequential order
 */
const APPRAISAL_STAGES = [
    'SELF_REVIEW',
    'SUPERVISOR_REVIEW',
    'MATRIX_REVIEW',
    'MANAGER_REVIEW',
    'HR_REVIEW',
    'FINAL_REVIEW'
];
class AppraisalService {
    /**
     * Initialize a new Appraisal Cycle and generate packets for employees
     */
    static async initCycle(organizationId, data) {
        let { title, period, startDate, endDate, employeeIds, cycleId } = data;
        // If cycleId provided, look up the cycle from the Cycle table and create an AppraisalCycle from it
        let cycle;
        if (cycleId) {
            const existingCycle = await client_1.default.cycle.findFirst({ where: { id: cycleId, organizationId } });
            if (!existingCycle)
                throw new Error('Cycle not found');
            title = title || existingCycle.name;
            period = period || `${new Date(existingCycle.startDate).getFullYear()}`;
            startDate = startDate || existingCycle.startDate;
            endDate = endDate || existingCycle.endDate;
        }
        if (!title)
            throw new Error('title is required');
        if (!startDate || !endDate)
            throw new Error('startDate and endDate are required');
        // Check if an appraisal cycle already exists for this period
        const existingAppraisalCycle = await client_1.default.appraisalCycle.findFirst({
            where: { organizationId, title, status: { not: 'ARCHIVED' } }
        });
        if (existingAppraisalCycle) {
            throw new Error(`An appraisal cycle named "${title}" already exists and is active. Archive it first.`);
        }
        cycle = await client_1.default.appraisalCycle.create({
            data: {
                organizationId,
                title,
                period: String(period || new Date().getFullYear()),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'ACTIVE'
            }
        });
        const employees = await client_1.default.user.findMany({
            where: {
                organizationId,
                isArchived: false,
                role: { notIn: ['DEV', 'MD'] }, // MD and DEV don't receive appraisal packets
                ...(employeeIds ? { id: { in: employeeIds } } : {})
            },
            include: {
                supervisor: true,
                departmentObj: { include: { manager: true } },
                managedReportingLines: {
                    where: { type: 'DOTTED', effectiveTo: null },
                    take: 1
                }
            }
        });
        for (const emp of employees) {
            // Resolve reviewers for the packet cache
            const supervisorId = emp.supervisorId;
            const matrixSupervisorId = emp.managedReportingLines?.[0]?.managerId || null;
            const managerId = emp.departmentObj?.managerId || null;
            // HR and Final are usually global or MD
            // HR reviewer = highest-rank user who is not the employee (DIRECTOR+ serves as HR in absence of dedicated HR role)
            const hrReviewerId = (await client_1.default.user.findFirst({
                where: { organizationId, role: { in: ['DIRECTOR', 'MD', 'HR'] }, id: { not: emp.id }, isArchived: false },
                orderBy: { role: 'asc' } // DIRECTOR before MD
            }))?.id || null;
            const finalReviewerId = (await client_1.default.user.findFirst({
                where: { organizationId, role: { in: ['MD', 'DEV'] }, id: { not: emp.id }, isArchived: false }
            }))?.id || null;
            await client_1.default.appraisalPacket.create({
                data: {
                    organizationId,
                    cycleId: cycle.id,
                    employeeId: emp.id,
                    currentStage: 'SELF_REVIEW',
                    status: 'OPEN',
                    supervisorId,
                    matrixSupervisorId,
                    managerId,
                    hrReviewerId,
                    finalReviewerId
                }
            });
            await (0, websocket_service_1.notify)(emp.id, '📈 Appraisal Cycle Started', `The ${title} cycle has begun. Please complete your self-review.`, 'INFO', '/appraisals');
        }
        return cycle;
    }
    static async updateCycle(organizationId, cycleId, data) {
        const { title, period, startDate, endDate, status } = data;
        return client_1.default.appraisalCycle.update({
            where: { id: cycleId, organizationId },
            data: {
                ...(title && { title }),
                ...(period && { period: String(period) }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
                ...(status && { status })
            }
        });
    }
    static async deleteCycle(organizationId, cycleId) {
        // Cascading delete is handled by Prisma (onDelete: Cascade) in schema for Packets -> Reviews
        return client_1.default.appraisalCycle.delete({
            where: { id: cycleId, organizationId }
        });
    }
    /**
     * Submit a review for a specific stage
     */
    static async submitReview(packetId, userId, organizationId, reviewData) {
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id: packetId, organizationId },
            include: { employee: true }
        });
        if (!packet)
            throw new Error('Appraisal packet not found');
        // Permission check based on stage
        const currentStage = packet.currentStage;
        const isOwner = this.isStageOwner(packet, currentStage, userId);
        if (!isOwner)
            throw new Error(`You are not the authorized reviewer for the ${currentStage} stage.`);
        // Whitelist safe fields only (prevent arbitrary field injection)
        const { overallRating, summary, strengths, weaknesses, achievements, developmentNeeds, responses } = reviewData;
        const safeData = {
            ...(overallRating !== undefined && { overallRating: Number(overallRating) }),
            ...(summary !== undefined && { summary: String(summary) }),
            ...(strengths !== undefined && { strengths: String(strengths) }),
            ...(weaknesses !== undefined && { weaknesses: String(weaknesses) }),
            ...(achievements !== undefined && { achievements: String(achievements) }),
            ...(developmentNeeds !== undefined && { developmentNeeds: String(developmentNeeds) }),
            ...(responses !== undefined && { responses: typeof responses === 'string' ? responses : JSON.stringify(responses) }),
        };
        // Create or Update the review layer
        const review = await client_1.default.appraisalReview.upsert({
            where: {
                packetId_reviewStage: {
                    packetId,
                    reviewStage: currentStage
                }
            },
            update: {
                ...safeData,
                status: 'SUBMITTED',
                submittedAt: new Date()
            },
            create: {
                organizationId,
                packetId,
                reviewerId: userId,
                reviewStage: currentStage,
                ...safeData,
                status: 'SUBMITTED',
                submittedAt: new Date()
            }
        });
        // Advance to next stage logic
        await this.advancePacket(packetId, organizationId);
        return review;
    }
    /**
     * Internal: Move packet to next valid stage
     */
    static async advancePacket(packetId, organizationId) {
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id: packetId, organizationId },
            include: { employee: true }
        });
        if (!packet)
            return;
        const currentIndex = APPRAISAL_STAGES.indexOf(packet.currentStage);
        let nextIndex = currentIndex + 1;
        let nextStageFound = false;
        let nextStage = 'COMPLETED';
        while (nextIndex < APPRAISAL_STAGES.length) {
            const candidateStage = APPRAISAL_STAGES[nextIndex];
            const reviewerId = this.getReviewerForStage(packet, candidateStage);
            // Rule: Skip if no valid reviewer
            if (!reviewerId) {
                nextIndex++;
                continue;
            }
            // Rule: Collapse duplicates (if next reviewer is same as current)
            const currentReviewer = this.getReviewerForStage(packet, packet.currentStage);
            if (reviewerId === currentReviewer) {
                nextIndex++;
                continue;
            }
            nextStage = candidateStage;
            nextStageFound = true;
            break;
        }
        await client_1.default.appraisalPacket.update({
            where: { id: packetId },
            data: {
                currentStage: nextStage,
                status: nextStage === 'COMPLETED' ? 'COMPLETED' : 'OPEN'
            }
        });
        // Notify next reviewer
        if (nextStageFound) {
            const nextReviewerId = this.getReviewerForStage(packet, nextStage);
            if (nextReviewerId) {
                await (0, websocket_service_1.notify)(nextReviewerId, '📋 Appraisal Review Pending', `You have a pending review for ${packet.employee.fullName}`, 'INFO', '/team/appraisals');
            }
        }
    }
    static isStageOwner(packet, stage, userId) {
        if (stage === 'SELF_REVIEW')
            return packet.employeeId === userId;
        if (stage === 'SUPERVISOR_REVIEW')
            return packet.supervisorId === userId;
        if (stage === 'MATRIX_REVIEW')
            return packet.matrixSupervisorId === userId;
        if (stage === 'MANAGER_REVIEW')
            return packet.managerId === userId;
        if (stage === 'HR_REVIEW')
            return packet.hrReviewerId === userId;
        if (stage === 'FINAL_REVIEW')
            return packet.finalReviewerId === userId;
        return false;
    }
    static getReviewerForStage(packet, stage) {
        if (stage === 'SELF_REVIEW')
            return packet.employeeId;
        if (stage === 'SUPERVISOR_REVIEW')
            return packet.supervisorId;
        if (stage === 'MATRIX_REVIEW')
            return packet.matrixSupervisorId;
        if (stage === 'MANAGER_REVIEW')
            return packet.managerId;
        if (stage === 'HR_REVIEW')
            return packet.hrReviewerId;
        if (stage === 'FINAL_REVIEW')
            return packet.finalReviewerId;
        return null;
    }
    static async getPacketDetail(packetId, organizationId) {
        return client_1.default.appraisalPacket.findUnique({
            where: { id: packetId, organizationId },
            include: {
                employee: { select: { id: true, fullName: true, avatarUrl: true, jobTitle: true } },
                cycle: true,
                reviews: {
                    include: { reviewer: { select: { fullName: true, avatarUrl: true } } },
                    orderBy: { submittedAt: 'asc' }
                }
            }
        });
    }
    static async getEmployeePackets(employeeId, organizationId) {
        return client_1.default.appraisalPacket.findMany({
            where: { employeeId, organizationId },
            include: {
                cycle: true,
                employee: { select: { fullName: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async getReviewerPackets(userId, organizationId) {
        return client_1.default.appraisalPacket.findMany({
            where: {
                organizationId,
                OR: [
                    { supervisorId: userId },
                    { matrixSupervisorId: userId },
                    { managerId: userId },
                    { hrReviewerId: userId },
                    { finalReviewerId: userId }
                ]
            },
            include: {
                cycle: true,
                employee: { select: { fullName: true, avatarUrl: true, jobTitle: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }
    /**
     * Get packets awaiting final institutional sign-off (for MD/Director)
     */
    static async getFinalVerdictList(organizationId) {
        return client_1.default.appraisalPacket.findMany({
            where: {
                organizationId,
                currentStage: 'FINAL_REVIEW',
                status: 'OPEN'
            },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
                cycle: true,
                reviews: {
                    include: { reviewer: { select: { fullName: true } } }
                }
            },
            orderBy: { updatedAt: 'asc' }
        });
    }
    /**
     * Final Sign-off: Close the packet and set final status
     */
    static async finalizePacket(packetId, userId, organizationId) {
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id: packetId, organizationId }
        });
        if (!packet)
            throw new Error('Packet not found');
        if (packet.currentStage !== 'FINAL_REVIEW')
            throw new Error('Packet is not in the final review stage');
        return client_1.default.appraisalPacket.update({
            where: { id: packetId },
            data: {
                currentStage: 'COMPLETED',
                status: 'COMPLETED',
                updatedAt: new Date()
            }
        });
    }
    /**
     * Update an appraisal packet (admin/MD only)
     */
    static async updatePacket(organizationId, packetId, data) {
        const { supervisorId, managerId, matrixSupervisorId, hrReviewerId, finalReviewerId, currentStage, status } = data;
        return client_1.default.appraisalPacket.update({
            where: { id: packetId, organizationId },
            data: {
                ...(supervisorId !== undefined && { supervisorId }),
                ...(managerId !== undefined && { managerId }),
                ...(matrixSupervisorId !== undefined && { matrixSupervisorId }),
                ...(hrReviewerId !== undefined && { hrReviewerId }),
                ...(finalReviewerId !== undefined && { finalReviewerId }),
                ...(currentStage !== undefined && { currentStage }),
                ...(status !== undefined && { status }),
                updatedAt: new Date()
            }
        });
    }
    /**
     * Delete an appraisal packet (admin/MD only)
     */
    static async deletePacket(organizationId, packetId) {
        return client_1.default.appraisalPacket.delete({
            where: { id: packetId, organizationId }
        });
    }
    /**
     * Get all packets for a specific cycle (MD/HR Oversight)
     */
    static async getCyclePackets(organizationId, cycleId) {
        return client_1.default.appraisalPacket.findMany({
            where: { organizationId, cycleId },
            include: {
                employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
                reviews: {
                    select: { reviewStage: true, status: true }
                }
            },
            orderBy: { employee: { fullName: 'asc' } }
        });
    }
}
exports.AppraisalService = AppraisalService;
