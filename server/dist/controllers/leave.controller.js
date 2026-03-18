"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllLeaves = exports.cancelLeave = exports.processLeave = exports.getPendingLeaves = exports.getMyLeaveBalance = exports.getMyLeaves = exports.applyForLeave = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const enterprise_controller_1 = require("./enterprise.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
// FIX: Calculate working days only (skip weekends)
const calculateWorkingDays = (start, end) => {
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (cur <= endDate) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6)
            count++; // Skip Sunday (0) and Saturday (6)
        cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
};
// --- 1. APPLY FOR LEAVE ---
const applyForLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason, relieverId, leaveType } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const userReq = req.user;
        const employeeId = userReq.id;
        const role = userReq.role;
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
        }
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date' });
        }
        const user = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const daysRequested = calculateWorkingDays(new Date(startDate), new Date(endDate));
        const initialStatus = relieverId ? 'PENDING_RELIEVER' : 'PENDING_MANAGER';
        if ((0, auth_middleware_1.getRoleRank)(role) < 80) {
            if ((user.leaveBalance || 0) < daysRequested) {
                return res.status(400).json({ error: `Insufficient leave balance. You have ${user.leaveBalance} days, requested ${daysRequested}.` });
            }
        }
        const leave = await client_1.default.leaveRequest.create({
            data: {
                organizationId,
                employeeId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaveDays: daysRequested,
                reason,
                relieverId: relieverId || null,
                status: initialStatus
            }
        });
        await (0, audit_service_1.logAction)(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);
        // FIX: WhatsApp/SMS Notification to Supervisor
        if (user.supervisorId) {
            const supervisor = await client_1.default.user.findFirst({ where: { id: user.supervisorId, organizationId } });
            if (supervisor?.contactNumber) {
                Promise.resolve().then(() => __importStar(require('../services/sms.service'))).then(({ sendSMS }) => {
                    sendSMS({
                        to: supervisor.contactNumber,
                        message: `Nexus HRM: ${user.fullName} requested ${daysRequested} days of leave. Review now in the portal.`
                    }).catch(err => console.error('SMS trigger failed:', err));
                });
            }
        }
        return res.status(201).json(leave);
    }
    catch (error) {
        console.error('Leave Error:', error);
        return res.status(500).json({ error: 'Failed to submit leave request' });
    }
};
exports.applyForLeave = applyForLeave;
// --- 2. GET MY LEAVES ---
const getMyLeaves = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userReq = req.user;
        const userId = userReq.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const [leaves, total] = await Promise.all([
            client_1.default.leaveRequest.findMany({
                where: { employeeId: userId, ...whereOrg },
                orderBy: { createdAt: 'desc' },
                include: {
                    reliever: { select: { fullName: true } },
                    employee: { select: { fullName: true } }
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            client_1.default.leaveRequest.count({ where: { employeeId: userId, ...whereOrg } })
        ]);
        return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        return res.status(500).json({ error: 'Fetch failed' });
    }
};
exports.getMyLeaves = getMyLeaves;
const getMyLeaveBalance = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userReq = req.user;
        const userId = userReq.id;
        const user = await client_1.default.user.findFirst({
            where: { id: userId, ...whereOrg },
            select: { leaveBalance: true, leaveAllowance: true }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ leaveBalance: user.leaveBalance || 0, leaveAllowance: user.leaveAllowance || 0 });
    }
    catch (error) {
        res.status(500).json({ error: 'Fetch failed' });
    }
};
exports.getMyLeaveBalance = getMyLeaveBalance;
// --- 3. GET PENDING REQUESTS (Hardened) ---
const getPendingLeaves = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userReq = req.user;
        const managerId = userReq.id;
        const role = userReq.role;
        const rank = (0, auth_middleware_1.getRoleRank)(role);
        let leaves = [];
        if (rank >= 80) {
            // HR/MD see everything pending Manager OR HR/MD
            leaves = await client_1.default.leaveRequest.findMany({
                where: {
                    status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER', 'PENDING_HR_MD'] },
                    ...whereOrg
                },
                include: {
                    employee: { select: { fullName: true, departmentObj: { select: { name: true } } } },
                    reliever: { select: { fullName: true } }
                },
                orderBy: { startDate: 'asc' }
            });
        }
        else if (rank >= 60) {
            // Managers only see their direct subordinates' pending requests
            const subordinates = await client_1.default.user.findMany({
                where: { supervisorId: managerId, ...whereOrg },
                select: { id: true }
            });
            const subordinateIds = subordinates.map(u => u.id);
            leaves = await client_1.default.leaveRequest.findMany({
                where: {
                    employeeId: { in: subordinateIds },
                    status: { in: ['PENDING_MANAGER', 'PENDING_RELIEVER'] },
                    ...whereOrg
                },
                include: { employee: { select: { fullName: true } } },
                orderBy: { startDate: 'asc' }
            });
        }
        return res.json(leaves);
    }
    catch (error) {
        return res.status(500).json({ error: 'Fetch failed' });
    }
};
exports.getPendingLeaves = getPendingLeaves;
// --- 4. APPROVE/REJECT LEAVE (Tiered Approval) ---
const processLeave = async (req, res) => {
    try {
        const { id, action, comment } = req.body;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userReq = req.user;
        const actorId = userReq.id;
        const actorRole = userReq.role;
        const actorRank = (0, auth_middleware_1.getRoleRank)(actorRole);
        if (!id || !action)
            return res.status(400).json({ error: 'id and action are required' });
        const leave = await client_1.default.leaveRequest.findFirst({
            where: { id, ...whereOrg },
            include: { employee: true }
        });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        // 🛡️ SECURITY CHECK
        if (actorRank < 80) {
            // Managers can only process if it's their direct report
            if (leave.employee?.supervisorId !== actorId) {
                return res.status(403).json({ error: 'Not authorized to process this leave' });
            }
        }
        let nextStatus = action === 'REJECTED' ? 'REJECTED' : 'APPROVED';
        // 🔄 TIERED LOGIC
        if (action === 'APPROVED') {
            if (actorRank < 80) {
                // Manager approval is only Stage 1
                nextStatus = 'PENDING_HR_MD';
            }
            else {
                // HR/MD approval is Final
                nextStatus = 'APPROVED';
            }
        }
        // FIX: Use a transaction so approval and balance deduction are atomic
        const [updatedLeave] = await client_1.default.$transaction(async (tx) => {
            await tx.leaveRequest.update({
                where: { id },
                data: { status: nextStatus, managerComment: comment }
            });
            const updated = await tx.leaveRequest.findFirst({ where: { id } });
            if (!updated)
                throw new Error("Leave request not found during transaction");
            // Only deduct balance on FINAL approval
            if (nextStatus === 'APPROVED') {
                const employee = await tx.user.findFirst({
                    where: { id: updated.employeeId, ...whereOrg }
                });
                if (employee) {
                    const newBalance = Math.max(0, (employee.leaveBalance || 0) - (updated.leaveDays || 0));
                    await tx.user.updateMany({
                        where: { id: employee.id, ...whereOrg },
                        data: { leaveBalance: newBalance }
                    });
                }
            }
            return [updated];
        });
        await (0, audit_service_1.logAction)(actorId, `LEAVE_${nextStatus}`, 'LeaveRequest', updatedLeave.id, { leaveDays: updatedLeave.leaveDays }, req.ip);
        await client_1.default.employeeHistory.create({
            data: {
                organizationId: orgId || 'default-tenant',
                employeeId: updatedLeave.employeeId,
                loggedById: actorId,
                type: 'UPDATE',
                severity: 'LOW',
                status: 'CLOSED',
                title: `Leave ${nextStatus.toLowerCase()}`,
                description: `Leave ${nextStatus.toLowerCase()} processed by ${userReq.name}`
            }
        });
        return res.json(updatedLeave);
    }
    catch (error) {
        console.error('Process Leave Error:', error);
        return res.status(500).json({ error: 'Process failed' });
    }
};
exports.processLeave = processLeave;
// --- 5. CANCEL LEAVE (Employee can cancel pending requests) ---
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userReq = req.user;
        const userId = userReq.id;
        const leave = await client_1.default.leaveRequest.findFirst({ where: { id, ...whereOrg } });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        if (leave.employeeId !== userId)
            return res.status(403).json({ error: 'Unauthorized' });
        if (leave.status === 'APPROVED')
            return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });
        await client_1.default.leaveRequest.updateMany({
            where: { id, ...whereOrg },
            data: { status: 'CANCELLED' }
        });
        const updated = await client_1.default.leaveRequest.findFirst({ where: { id, ...whereOrg } });
        await (0, audit_service_1.logAction)(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: 'Cancel failed' });
    }
};
exports.cancelLeave = cancelLeave;
// --- 6. GET ALL LEAVES (Admin/MD) with pagination ---
const getAllLeaves = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const userReq = req.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const where = { ...whereOrg };
        if (status)
            where.status = status;
        const [leaves, total] = await Promise.all([
            client_1.default.leaveRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                    reliever: { select: { fullName: true } }
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            client_1.default.leaveRequest.count({ where })
        ]);
        return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        return res.status(500).json({ error: 'Fetch failed' });
    }
};
exports.getAllLeaves = getAllLeaves;
