"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyReliefRequests = exports.getAllLeaves = exports.cancelLeave = exports.processLeave = exports.getPendingLeaves = exports.getMyLeaveBalance = exports.getMyLeaves = exports.getEligibleRelievers = exports.applyForLeave = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const leave_service_1 = require("../services/leave.service");
const websocket_service_1 = require("../services/websocket.service");
const getOrgId = (req) => req.user?.organizationId || 'default-tenant';
// Working-day calculator (weekends excluded)
const calcWorkingDays = (start, end) => {
    let count = 0;
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const fin = new Date(end);
    fin.setHours(0, 0, 0, 0);
    while (cur <= fin) {
        const d = cur.getDay();
        if (d !== 0 && d !== 6)
            count++;
        cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
};
// ── 1. APPLY FOR LEAVE ────────────────────────────────────────────────────────
const applyForLeave = async (req, res) => {
    try {
        const { startDate, endDate, reason, relieverId, leaveType } = req.body;
        const orgId = getOrgId(req);
        const user = req.user;
        const employeeId = user.id;
        const rank = (0, auth_middleware_1.getRoleRank)(user.role);
        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ error: 'startDate, endDate, and reason are required' });
        }
        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ error: 'End date cannot be before start date' });
        }
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId: orgId } });
        if (!employee)
            return res.status(404).json({ error: 'User not found' });
        // ── L1 FIX: Reliever must be same rank level ──────────────────────────────
        if (relieverId) {
            const reliever = await client_1.default.user.findFirst({ where: { id: relieverId, organizationId: orgId, isArchived: false } });
            if (!reliever)
                return res.status(400).json({ error: 'Selected reliever not found' });
            const myRank = (0, auth_middleware_1.getRoleRank)(employee.role);
            const relieverRank = (0, auth_middleware_1.getRoleRank)(reliever.role);
            // Same rank OR one level adjacent (e.g. STAFF can relieve MID_MANAGER and vice versa within reasonable range)
            if (Math.abs(myRank - relieverRank) > 10) {
                return res.status(400).json({
                    error: `Reliever must be at a similar level. Your rank: ${employee.role} (${myRank}), ${reliever.fullName}'s rank: ${reliever.role} (${relieverRank}). Please select a colleague at the same level.`
                });
            }
        }
        const daysRequested = calcWorkingDays(new Date(startDate), new Date(endDate));
        // Balance check (skip for Directors+)
        if (rank < 80) {
            if ((employee.leaveBalance || 0) < daysRequested) {
                return res.status(400).json({
                    error: `Insufficient leave balance. You have ${employee.leaveBalance} days remaining, requested ${daysRequested}.`
                });
            }
        }
        const initialStatus = relieverId ? 'SUBMITTED' : 'MANAGER_REVIEW';
        const leave = await client_1.default.leaveRequest.create({
            data: {
                organizationId: orgId,
                employeeId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                leaveDays: daysRequested,
                reason,
                leaveType: leaveType || 'Annual',
                relieverId: relieverId || null,
                status: initialStatus,
            },
        });
        // Notify reliever or supervisor
        if (relieverId) {
            await (0, websocket_service_1.notify)(relieverId, '🤝 Handover Request', `${employee.fullName} has requested you as reliever for ${daysRequested} day(s).`, 'INFO', '/leave');
        }
        else if (employee.supervisorId) {
            await (0, websocket_service_1.notify)(employee.supervisorId, '📅 New Leave Request', `${employee.fullName} has requested ${daysRequested} day(s) of leave.`, 'INFO', '/leave');
        }
        await (0, audit_service_1.logAction)(employeeId, 'LEAVE_APPLIED', 'LeaveRequest', leave.id, { daysRequested, leaveType }, req.ip);
        return res.status(201).json(leave);
    }
    catch (error) {
        console.error('Leave apply error:', error);
        return res.status(500).json({ error: error.message || 'Failed to submit leave request' });
    }
};
exports.applyForLeave = applyForLeave;
// ── 2. GET ELIGIBLE RELIEVERS (same-rank peers) ────────────────────────────── 
const getEligibleRelievers = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const me = await client_1.default.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { role: true } });
        if (!me)
            return res.status(404).json({ error: 'User not found' });
        const myRank = (0, auth_middleware_1.getRoleRank)(me.role);
        // Find all active employees within ±10 rank points (same or adjacent level)
        const allUsers = await client_1.default.user.findMany({
            where: { organizationId: orgId, isArchived: false, status: 'ACTIVE', id: { not: userId } },
            select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
        });
        const eligible = allUsers.filter(u => {
            const uRank = (0, auth_middleware_1.getRoleRank)(u.role);
            return Math.abs(uRank - myRank) <= 10;
        });
        return res.json(eligible);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getEligibleRelievers = getEligibleRelievers;
// ── 3. GET MY LEAVES ──────────────────────────────────────────────────────────
const getMyLeaves = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const [leaves, total] = await Promise.all([
            client_1.default.leaveRequest.findMany({
                where: { employeeId: userId, organizationId: orgId },
                orderBy: { createdAt: 'desc' },
                include: {
                    reliever: { select: { fullName: true } },
                    employee: { select: { fullName: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            client_1.default.leaveRequest.count({ where: { employeeId: userId, organizationId: orgId } }),
        ]);
        return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyLeaves = getMyLeaves;
// ── 4. MY LEAVE BALANCE ───────────────────────────────────────────────────────
const getMyLeaveBalance = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const user = await client_1.default.user.findFirst({
            where: { id: userId, organizationId: orgId },
            select: { leaveBalance: true, leaveAllowance: true },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json({ leaveBalance: user.leaveBalance ?? 0, leaveAllowance: user.leaveAllowance ?? 24 });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyLeaveBalance = getMyLeaveBalance;
// ── 5. GET PENDING (Manager/HR queue) ─────────────────────────────────────────
const getPendingLeaves = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id: managerId, role } = req.user;
        const rank = (0, auth_middleware_1.getRoleRank)(role);
        let leaves;
        if (rank >= 80) {
            // Directors+ see ALL pending
            leaves = await client_1.default.leaveRequest.findMany({
                where: { organizationId: orgId, status: { in: ['MANAGER_REVIEW', 'HR_REVIEW', 'SUBMITTED'] } },
                include: {
                    employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                    reliever: { select: { fullName: true } },
                },
                orderBy: { startDate: 'asc' },
            });
        }
        else {
            // Managers (60-79) see their direct reports only
            const subordinates = await client_1.default.user.findMany({
                where: { organizationId: orgId, supervisorId: managerId },
                select: { id: true },
            });
            const ids = subordinates.map(u => u.id);
            leaves = await client_1.default.leaveRequest.findMany({
                where: { organizationId: orgId, employeeId: { in: ids }, status: { in: ['MANAGER_REVIEW', 'SUBMITTED'] } },
                include: {
                    employee: { select: { fullName: true, jobTitle: true } },
                    reliever: { select: { fullName: true } },
                },
                orderBy: { startDate: 'asc' },
            });
        }
        return res.json(leaves);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getPendingLeaves = getPendingLeaves;
// ── 6. PROCESS LEAVE (Reliever / Manager / HR) ────────────────────────────────
const processLeave = async (req, res) => {
    try {
        const { id, action, comment, role: actorRoleHint } = req.body;
        const actorId = req.user.id;
        const actorRole = req.user.role;
        const rank = (0, auth_middleware_1.getRoleRank)(actorRole);
        let updated;
        if (actorRoleHint === 'RELIEVER') {
            updated = await leave_service_1.LeaveService.respondAsReliever(id, actorId, action === 'APPROVE', comment);
        }
        else if (actorRoleHint === 'HR' || rank >= 80) {
            updated = await leave_service_1.LeaveService.hrFinalReview(id, actorId, action === 'APPROVE', comment);
        }
        else {
            updated = await leave_service_1.LeaveService.managerReview(id, actorId, action === 'APPROVE', comment);
        }
        await (0, audit_service_1.logAction)(actorId, `LEAVE_${action}_BY_${actorRoleHint || actorRole}`, 'LeaveRequest', id, { comment }, req.ip);
        return res.json(updated);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.processLeave = processLeave;
// ── 7. CANCEL LEAVE ───────────────────────────────────────────────────────────
const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const leave = await client_1.default.leaveRequest.findFirst({ where: { id, organizationId: orgId } });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        if (leave.employeeId !== userId)
            return res.status(403).json({ error: 'Not your leave request' });
        if (leave.status === 'APPROVED')
            return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact HR.' });
        const updated = await client_1.default.leaveRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        await (0, audit_service_1.logAction)(userId, 'LEAVE_CANCELLED', 'LeaveRequest', id, {}, req.ip);
        return res.json(updated);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.cancelLeave = cancelLeave;
// ── 8. GET ALL LEAVES (Admin view, rank 80+) ──────────────────────────────────
// L4 FIX: This route is rank-guarded in routes file, so only Directors+ reach it
const getAllLeaves = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const { status } = req.query;
        const where = { organizationId: orgId };
        if (status)
            where.status = status;
        const [leaves, total] = await Promise.all([
            client_1.default.leaveRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    employee: { select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } } } },
                    reliever: { select: { fullName: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            client_1.default.leaveRequest.count({ where }),
        ]);
        return res.json({ leaves, total, page, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getAllLeaves = getAllLeaves;
// ── 9. GET MY RELIEF REQUESTS (requests where I am the reliever) ──────────────
const getMyReliefRequests = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const requests = await client_1.default.leaveRequest.findMany({
            where: { organizationId: orgId, relieverId: userId, status: 'SUBMITTED' },
            include: { employee: { select: { fullName: true, jobTitle: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(requests);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyReliefRequests = getMyReliefRequests;
