"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getDepartments = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const getDepartments = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        let departments = await client_1.default.department.findMany({
            where: whereOrg,
            include: {
                manager: {
                    select: { fullName: true }
                },
                employees: {
                    select: { id: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        // Fallback: If no departments for current tenant, try to find default-tenant ones
        if (departments.length === 0 && orgId && orgId !== 'default-tenant') {
            departments = await client_1.default.department.findMany({
                where: { organizationId: 'default-tenant' },
                include: {
                    manager: { select: { fullName: true } },
                    employees: { select: { id: true } }
                },
                orderBy: { name: 'asc' }
            });
        }
        const employeeIds = departments.flatMap((dept) => dept.employees.map((emp) => emp.id));
        const sheets = await client_1.default.kpiSheet.findMany({
            where: {
                ...whereOrg,
                employeeId: { in: employeeIds },
                totalScore: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            select: { employeeId: true, totalScore: true }
        });
        const latestScores = new Map();
        for (const sheet of sheets) {
            if (!sheet.employeeId || latestScores.has(sheet.employeeId))
                continue;
            latestScores.set(sheet.employeeId, sheet.totalScore ?? 0);
        }
        const payload = departments.map((dept) => {
            const scores = dept.employees
                .map((emp) => latestScores.get(emp.id))
                .filter((score) => typeof score === 'number');
            const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
            return {
                id: dept.id,
                name: dept.name,
                managerId: dept.managerId,
                manager: dept.manager ? { fullName: dept.manager.fullName } : null,
                memberCount: dept.employees.length,
                score: Math.round(avgScore)
            };
        });
        res.json(payload);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getDepartments = getDepartments;
const createDepartment = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { name, managerId } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'Department name is required' });
        const existing = await client_1.default.department.findFirst({ where: { name: name.trim(), organizationId } });
        if (existing)
            return res.status(409).json({ error: 'Department already exists' });
        const dept = await client_1.default.department.create({ data: { name: name.trim(), organizationId, ...(managerId ? { managerId } : {}) } });
        res.status(201).json({ id: dept.id, name: dept.name, score: 0 });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.createDepartment = createDepartment;
const updateDepartment = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        const { name, managerId } = req.body;
        if (!name?.trim())
            return res.status(400).json({ error: 'Department name is required' });
        const dept = await client_1.default.department.update({
            where: { id: Number(req.params.id), ...whereOrg },
            data: { name: name.trim(), ...(managerId !== undefined ? { managerId: managerId || null } : {}) }
        });
        res.json({ id: dept.id, name: dept.name, score: 0 });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'Department not found' });
        res.status(500).json({ error: err.message });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const whereOrg = orgId ? { organizationId: orgId } : {};
        // Check no active employees
        const count = await client_1.default.user.count({
            where: { departmentId: Number(req.params.id), ...whereOrg, status: 'ACTIVE' }
        });
        if (count > 0)
            return res.status(409).json({ error: `Cannot delete: ${count} active employee(s) in this department` });
        await client_1.default.department.delete({ where: { id: Number(req.params.id), ...whereOrg } });
        res.json({ success: true });
    }
    catch (err) {
        if (err.code === 'P2025')
            return res.status(404).json({ error: 'Department not found' });
        res.status(500).json({ error: err.message });
    }
};
exports.deleteDepartment = deleteDepartment;
