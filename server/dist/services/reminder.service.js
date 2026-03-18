"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAppraisalReminders = exports.sendLeaveReminders = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("./audit.service");
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);
const sendLeaveReminders = async () => {
    const threshold = hoursAgo(48);
    const pendingLeaves = await client_1.default.leaveRequest.findMany({
        where: {
            status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER'] },
            createdAt: { lt: threshold }
        },
        include: { employee: { select: { fullName: true } } }
    });
    for (const leave of pendingLeaves) {
        await (0, audit_service_1.logAction)(null, 'LEAVE_APPROVAL_REMINDER', 'LeaveRequest', leave.id, {
            employee: leave.employee?.fullName,
            status: leave.status,
            startDate: leave.startDate,
            endDate: leave.endDate
        });
    }
    return pendingLeaves.length;
};
exports.sendLeaveReminders = sendLeaveReminders;
const sendAppraisalReminders = async () => {
    const threshold = hoursAgo(72);
    const pendingAppraisals = await client_1.default.appraisal.findMany({
        where: {
            status: { in: ['PENDING_SELF', 'PENDING_MANAGER'] },
            updatedAt: { lt: threshold }
        },
        include: {
            employee: { select: { fullName: true } },
            reviewer: { select: { fullName: true } },
            cycle: { select: { name: true } }
        }
    });
    for (const appraisal of pendingAppraisals) {
        await (0, audit_service_1.logAction)(null, 'APPRAISAL_REMINDER', 'Appraisal', appraisal.id, {
            employee: appraisal.employee?.fullName,
            reviewer: appraisal.reviewer?.fullName,
            status: appraisal.status,
            cycle: appraisal.cycle?.name
        });
    }
    return pendingAppraisals.length;
};
exports.sendAppraisalReminders = sendAppraisalReminders;
