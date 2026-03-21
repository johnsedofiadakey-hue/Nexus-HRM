"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
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
        const { startDate, endDate, reason, relieverId, leaveType } = data;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const leaveDays = this.calculateWorkingDays(start, end);
        const user = await client_1.default.user.findUnique({ where: { id: employeeId } });
        if (!user)
            throw new Error('User not found');
        // Balance check
        if ((user.leaveBalance || 0) < leaveDays) {
            throw new Error(`Insufficient leave balance. Needed ${leaveDays}, has ${user.leaveBalance}`);
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
                status: initialStatus
            }
        });
        if (relieverId) {
            await (0, websocket_service_1.notify)(relieverId, '🤝 Handover Request', `${user.fullName} has requested you as a reliever for leave.`, 'INFO', '/leave');
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
            include: { employee: true }
        });
        if (!leave)
            throw new Error('Leave request not found');
        if (leave.relieverId !== relieverId)
            throw new Error('Not authorized to respond as reliever');
        if (leave.status !== 'SUBMITTED')
            throw new Error('Leave is not in SUBMITTED state');
        const nextStatus = accept ? 'RELIEVER_ACCEPTED' : 'RELIEVER_DECLINED';
        const updated = await client_1.default.leaveRequest.update({
            where: { id: leaveId },
            data: {
                relieverStatus: accept ? 'ACCEPTED' : 'DECLINED',
                relieverComment: comment,
                relieverRespondedAt: new Date(),
                status: nextStatus
            }
        });
        // Notify employee
        await (0, websocket_service_1.notify)(leave.employeeId, accept ? '✅ Reliever Accepted' : '❌ Reliever Declined', `${leave.relieverId} has ${accept ? 'accepted' : 'declined'} your reliever request.`, accept ? 'SUCCESS' : 'WARNING', '/leave');
        // If accepted, auto-advance to Manager Review
        if (accept) {
            await client_1.default.leaveRequest.update({
                where: { id: leaveId },
                data: { status: 'MANAGER_REVIEW' }
            });
            if (leave.employee.supervisorId) {
                await (0, websocket_service_1.notify)(leave.employee.supervisorId, '📝 Leave Pending Manager Review', `${leave.employee.fullName}'s leave is now ready for your review.`, 'INFO', '/team/leave');
            }
        }
        return updated;
    }
    static async managerReview(leaveId, managerId, approve, comment) {
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id: leaveId },
            include: { employee: true }
        });
        if (!leave)
            throw new Error('Leave request not found');
        if (leave.status !== 'MANAGER_REVIEW')
            throw new Error('Not in Manager Review stage');
        // Basic permission check (Manager should be supervisor)
        if (leave.employee.supervisorId !== managerId) {
            // Allow HR/MD to override manager
            const manager = await client_1.default.user.findUnique({ where: { id: managerId } });
            if (!manager || !['DIRECTOR', 'MD', 'DEV'].includes(manager.role)) {
                throw new Error('Unauthorized to review this leave');
            }
        }
        const nextStatus = approve ? 'HR_REVIEW' : 'MANAGER_REJECTED';
        const updated = await client_1.default.leaveRequest.update({
            where: { id: leaveId },
            data: {
                status: nextStatus,
                managerComment: comment,
                manager: { connect: { id: managerId } }
            }
        });
        await (0, websocket_service_1.notify)(leave.employeeId, approve ? '📋 Manager Approved' : '❌ Manager Rejected', `Your manager has ${approve ? 'approved' : 'rejected'} your leave request.`, approve ? 'INFO' : 'ERROR', '/leave');
        return updated;
    }
    static async hrFinalReview(leaveId, hrId, approve, comment) {
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id: leaveId },
            include: { employee: true }
        });
        if (!leave)
            throw new Error('Leave request not found');
        if (leave.status !== 'HR_REVIEW')
            throw new Error('Not in HR Review stage');
        const nextStatus = approve ? 'APPROVED' : 'HR_REJECTED';
        return client_1.default.$transaction(async (tx) => {
            const updated = await tx.leaveRequest.update({
                where: { id: leaveId },
                data: {
                    status: nextStatus,
                    hrComment: comment,
                    hrReviewer: { connect: { id: hrId } }
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
            await (0, websocket_service_1.notify)(leave.employeeId, approve ? '🎉 Leave Fully Approved' : '❌ HR Rejected', `HR has ${approve ? 'finalized and approved' : 'rejected'} your leave request.`, approve ? 'SUCCESS' : 'ERROR', '/leave');
            return updated;
        });
    }
    static calculateWorkingDays(start, end) {
        let count = 0;
        const cur = new Date(start);
        cur.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0);
        while (cur <= endDate) {
            const day = cur.getDay();
            if (day !== 0 && day !== 6)
                count++;
            cur.setDate(cur.getDate() + 1);
        }
        return Math.max(1, count);
    }
}
exports.LeaveService = LeaveService;
