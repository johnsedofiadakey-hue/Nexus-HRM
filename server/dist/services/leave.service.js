"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
/**
 * Leave Statuses (V3):
 * DRAFT, SUBMITTED, RELIEVER_ACCEPTED, RELIEVER_DECLINED,
 * MANAGER_REVIEW, MANAGER_APPROVED, MANAGER_REJECTED,
 * HR_REVIEW, APPROVED, HR_REJECTED, CANCELLED
 */
class LeaveService {
    /**
     * Request leave.
     * Moves to SUBMITTED if reliever is specified, or direct to MANAGER_REVIEW if none.
     */
    static async requestLeave(organizationId, employeeId, data) {
        const { startDate, endDate, reason, relieverId, leaveType, handoverNotes } = data;
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Check for public holidays and weekends
        const holidays = await client_1.default.publicHoliday.findMany({
            where: {
                OR: [
                    { date: { gte: start, lte: end } },
                    { isRecurring: true } // Simplified check for recurring
                ]
            }
        });
        const leaveDays = this.calculateWorkingDaysWithHolidays(start, end, holidays);
        const user = await client_1.default.user.findUnique({ where: { id: employeeId } });
        if (!user)
            throw new Error('User not found');
        // Virtual Balance check: Actual Balance - Pending Requests
        const pendingRequests = await client_1.default.leaveRequest.findMany({
            where: { employeeId, status: { in: ['SUBMITTED', 'RELIEVER_ACCEPTED', 'MANAGER_REVIEW', 'HR_REVIEW'] } }
        });
        const pendingDays = pendingRequests.reduce((sum, r) => sum + Number(r.leaveDays || 0), 0);
        const availableBalance = Number(user.leaveBalance || 0) - pendingDays;
        if (availableBalance < leaveDays) {
            throw new Error(`Insufficient available balance. You have ${user.leaveBalance} days, but ${pendingDays} days are already tied up in pending requests. Available: ${availableBalance}, Needed: ${leaveDays}`);
        }
        const initialStatus = relieverId ? 'SUBMITTED' : 'MANAGER_REVIEW';
        const leave = await client_1.default.leaveRequest.create({
            data: {
                organizationId,
                employeeId,
                startDate: start,
                endDate: end,
                leaveDays,
                reason,
                relieverId: relieverId || null,
                handoverNotes: handoverNotes || null,
                relieverAcceptanceRequired: !!data.relieverAcceptanceRequired,
                status: initialStatus
            }
        });
        if (relieverId) {
            const noteSnippet = handoverNotes ? `\n\nHandover Notes: ${handoverNotes.substring(0, 100)}${handoverNotes.length > 100 ? '...' : ''}` : '';
            await (0, websocket_service_1.notify)(relieverId, '🤝 Handover Request', `${user.fullName} has requested you as a reliever for leave.${noteSnippet}`, 'INFO', '/leave');
        }
        else if (user.supervisorId) {
            await (0, websocket_service_1.notify)(user.supervisorId, '📅 New Leave Request', `${user.fullName} has requested leave.`, 'INFO', '/team/leave');
        }
        return leave;
    }
    /**
     * Reliever accepts or declines
     */
    static async respondAsReliever(leaveId, relieverId, accept, comment) {
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id: leaveId },
            include: { employee: true, reliever: { select: { fullName: true } } }
        });
        if (!leave)
            throw new Error('Leave request not found');
        if (leave.relieverId !== relieverId)
            throw new Error('Not authorized to respond as reliever');
        if (leave.status !== 'SUBMITTED')
            throw new Error('Leave is not in SUBMITTED state');
        const nextStatus = accept ? 'MANAGER_REVIEW' : 'RELIEVER_DECLINED';
        return client_1.default.$transaction(async (tx) => {
            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    relieverStatus: accept ? 'ACCEPTED' : 'DECLINED',
                    relieverComment: comment,
                    relieverRespondedAt: new Date(),
                    handoverAcknowledged: accept,
                    status: nextStatus
                }
            });
            if (accept) {
                // Create permanent Handover Register record for auditing
                await tx.handoverRecord.create({
                    data: {
                        organizationId: leave.organizationId || 'default-tenant',
                        leaveRequestId: leaveId,
                        requesterId: leave.employeeId,
                        relieverId: relieverId,
                        handoverNotes: leave.handoverNotes,
                        status: 'ACCEPTED'
                    }
                });
                if (leave.employee.supervisorId) {
                    await (0, websocket_service_1.notify)(leave.employee.supervisorId, '📝 Leave Pending Manager Review', `${leave.employee.fullName}'s leave is now ready for your review. Handover accepted by ${leave.reliever?.fullName || 'colleague'}.`, 'INFO', '/team/leave');
                }
            }
            // Notify employee
            await (0, websocket_service_1.notify)(leave.employeeId, accept ? '✅ Reliever Accepted' : '❌ Reliever Declined', `${leave.reliever?.fullName || 'Colleague'} has ${accept ? 'accepted' : 'declined'} your reliever request for leave starting ${leave.startDate.toLocaleDateString()}.`, accept ? 'SUCCESS' : 'WARNING', '/leave');
            return updated;
        });
    }
    static async managerReview(leaveId, managerId, approve, comment) {
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id: leaveId },
            include: { employee: true }
        });
        if (!leave)
            throw new Error('Leave request not found');
        if (leave.status !== 'MANAGER_REVIEW' && leave.status !== 'RELIEVER_ACCEPTED' && leave.status !== 'SUBMITTED') {
            throw new Error(`Invalid stage: Leave is currently in ${leave.status} status.`);
        }
        // ── L1 FIX: Enforce reliever acceptance if required ──────────────────────
        if (leave.relieverAcceptanceRequired && leave.relieverId && leave.status === 'SUBMITTED') {
            throw new Error('This leave requires reliever acceptance before manager approval can proceed.');
        }
        const actor = await client_1.default.user.findUnique({ where: { id: managerId } });
        if (!actor)
            throw new Error('Reviewer account not found');
        const rank = (0, auth_middleware_1.getRoleRank)(actor.role);
        // Step 1: Manager Review logic:
        // 1. Primary Manager (supervisorId)
        // 2. Any Manager (Rank >= 70) in the SAME department
        // 3. Any high-rank (Rank >= 75) or HR override
        const isPrimaryManager = leave.employee.supervisorId === managerId;
        const isDeptManager = actor.departmentId === leave.employee.departmentId && rank >= 70;
        const isHighRank = rank >= 75; // HR (75), Director (80), MD (90)
        if (!isPrimaryManager && !isDeptManager && !isHighRank) {
            throw new Error('Unauthorized for Step 1 Manager Review. You must be the direct supervisor, a manager in the same department, or an administrator.');
        }
        const nextStatus = approve ? 'HR_REVIEW' : 'MANAGER_REJECTED';
        const updated = await client_1.default.leaveRequest.update({
            where: { id: leaveId },
            data: {
                status: nextStatus,
                managerComment: comment,
                managerId: managerId
            }
        });
        await (0, websocket_service_1.notify)(leave.employeeId, approve ? '📋 Manager Approved' : '❌ Manager Rejected', `Your request has been ${approve ? 'approved' : 'rejected'} by ${actor.fullName}.`, approve ? 'INFO' : 'ERROR', '/leave');
        return updated;
    }
    static async hrFinalReview(leaveId, hrId, approve, comment) {
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id: leaveId },
            include: { employee: true }
        });
        if (!leave)
            throw new Error('Leave request not found');
        if (leave.status !== 'HR_REVIEW') {
            throw new Error(`Invalid stage: Leave is currently in ${leave.status} status. Final approval requires HR_REVIEW status.`);
        }
        const actor = await client_1.default.user.findUnique({
            where: { id: hrId },
            include: {
                managedReportingLines: {
                    where: { employeeId: leave.employeeId, type: 'DOTTED', effectiveTo: null }
                }
            }
        });
        if (!actor)
            throw new Error('Reviewer account not found');
        const rank = (0, auth_middleware_1.getRoleRank)(actor.role);
        // Step 2: Final Review logic:
        // 1. MD, Director, or HR (Rank >= 75)
        // 2. Secondary Supervisor (Dotted Line)
        const isSecondaryManager = actor.managedReportingLines && actor.managedReportingLines.length > 0;
        const isHighRank = rank >= 85;
        if (!isSecondaryManager && !isHighRank) {
            throw new Error('Unauthorized for Step 2 Final Approval. Only the Head of HR or MD can perform this step.');
        }
        const nextStatus = approve ? 'APPROVED' : 'HR_REJECTED';
        return client_1.default.$transaction(async (tx) => {
            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: nextStatus,
                    hrComment: comment,
                    hrReviewerId: hrId
                }
            });
            if (approve) {
                // Atomic balance deduction
                const user = await tx.user.findUnique({ where: { id: leave.employeeId } });
                if (user) {
                    await tx.user.update({
                        where: { id: user.id },
                        data: { leaveBalance: { decrement: leave.leaveDays || 0 } }
                    });
                }
            }
            await (0, websocket_service_1.notify)(leave.employeeId, approve ? '🎉 Leave Fully Approved' : '❌ HR/MD Rejected', `Your leave has been ${approve ? 'finalized and approved' : 'rejected'} by ${actor.fullName}.`, approve ? 'SUCCESS' : 'ERROR', '/leave');
            return updated;
        });
    }
    /**
     * Check if department leave concurrency exceeds 20%
     */
    static async checkLeaveOverlap(organizationId, departmentId, startDate, endDate) {
        const totalStaff = await client_1.default.user.count({
            where: { organizationId, departmentId, status: 'ACTIVE', isArchived: false }
        });
        if (totalStaff === 0)
            return { warning: false };
        // Find overlapping approved leaves
        const overlapping = await client_1.default.leaveRequest.count({
            where: {
                organizationId,
                status: 'APPROVED',
                isArchived: false,
                employee: { departmentId: departmentId },
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } }
                ]
            }
        });
        const ratio = (overlapping + 1) / totalStaff;
        if (ratio > 0.20) {
            return {
                warning: true,
                message: `Warning: This request will result in ${Math.round(ratio * 100)}% of your department being on leave simultaneously. This exceeds the 20% recommended threshold.`,
                ratio: ratio
            };
        }
        return { warning: false };
    }
    static calculateWorkingDaysWithHolidays(start, end, holidays) {
        let count = 0;
        const cur = new Date(start);
        cur.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0);
        const holidayDates = holidays.map(h => {
            const d = new Date(h.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        });
        while (cur <= endDate) {
            const day = cur.getDay();
            const isWeekend = (day === 0 || day === 6);
            const isHoliday = holidayDates.includes(cur.getTime());
            if (!isWeekend && !isHoliday)
                count++;
            cur.setDate(cur.getDate() + 1);
        }
        return Math.max(1, count);
    }
}
exports.LeaveService = LeaveService;
