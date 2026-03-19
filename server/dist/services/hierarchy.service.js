"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateSupervisorIds = exports.assignReporting = exports.getAllSubordinatesRecursive = exports.getDirectSubordinates = exports.getAllManagers = exports.getPrimaryManager = void 0;
/**
 * Hierarchy Service — Phase 2: Advanced Hierarchy System
 *
 * Replaces the single supervisorId model with a flexible matrix reporting structure.
 * Supports DIRECT, DOTTED, and PROJECT manager relationships.
 * All subordinate queries are recursive to support unlimited depth.
 */
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Get the primary (direct line) manager for an employee.
 */
const getPrimaryManager = async (employeeId, organizationId) => {
    const reporting = await prisma.employeeReporting.findFirst({
        where: { employeeId, organizationId, isPrimary: true, effectiveTo: null },
    });
    if (!reporting)
        return null;
    return prisma.user.findUnique({ where: { id: reporting.managerId } });
};
exports.getPrimaryManager = getPrimaryManager;
/**
 * Get ALL managers for an employee (direct, dotted, and project lines).
 */
const getAllManagers = async (employeeId, organizationId) => {
    const reportings = await prisma.employeeReporting.findMany({
        where: { employeeId, organizationId, effectiveTo: null },
    });
    if (!reportings.length)
        return [];
    const managerIds = reportings.map((r) => r.managerId);
    const managers = await prisma.user.findMany({
        where: { id: { in: managerIds } },
        select: { id: true, fullName: true, role: true, jobTitle: true, position: true },
    });
    // Attach the reporting type to each manager entry
    return managers.map((m) => ({
        ...m,
        reportingType: reportings.find((r) => r.managerId === m.id)?.type,
        isPrimary: reportings.find((r) => r.managerId === m.id)?.isPrimary,
    }));
};
exports.getAllManagers = getAllManagers;
/**
 * Get all DIRECT subordinates (one level down) for a manager.
 */
const getDirectSubordinates = async (managerId, organizationId, type = 'DIRECT') => {
    const reportings = await prisma.employeeReporting.findMany({
        where: { managerId, organizationId, type, effectiveTo: null },
    });
    if (!reportings.length)
        return [];
    const employeeIds = reportings.map((r) => r.employeeId);
    return prisma.user.findMany({
        where: { id: { in: employeeIds }, isArchived: false },
        select: { id: true, fullName: true, role: true, jobTitle: true, position: true, departmentId: true },
    });
};
exports.getDirectSubordinates = getDirectSubordinates;
/**
 * Recursively get ALL subordinates down the entire reporting chain.
 * This is an in-memory recursive BFS — suitable for orgs up to ~500 people.
 * For larger orgs, this should be replaced with a SQL CTE query.
 */
const getAllSubordinatesRecursive = async (managerId, organizationId) => {
    const visited = new Set();
    const queue = [managerId];
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId))
            continue;
        visited.add(currentId);
        const reports = await prisma.employeeReporting.findMany({
            where: { managerId: currentId, organizationId, effectiveTo: null },
            select: { employeeId: true },
        });
        const childIds = reports.map((r) => r.employeeId).filter((id) => !visited.has(id));
        queue.push(...childIds);
    }
    // Remove the root manager from the set
    visited.delete(managerId);
    return Array.from(visited);
};
exports.getAllSubordinatesRecursive = getAllSubordinatesRecursive;
/**
 * Assign or update a reporting relationship.
 * Phase A (Dual-Write): When setting a PRIMARY DIRECT manager, also writes back
 * to User.supervisorId to maintain backward compatibility during migration.
 */
const assignReporting = async (params) => {
    const { organizationId, employeeId, managerId, type, isPrimary } = params;
    // If setting as primary, demote any existing primary first
    if (isPrimary) {
        await prisma.employeeReporting.updateMany({
            where: { employeeId, organizationId, isPrimary: true, effectiveTo: null },
            data: { isPrimary: false },
        });
    }
    const reporting = await prisma.employeeReporting.upsert({
        where: { employeeId_managerId_type: { employeeId, managerId, type } },
        create: { organizationId, employeeId, managerId, type, isPrimary },
        update: { isPrimary, effectiveTo: null },
    });
    // ── PHASE A: Dual-Write ──────────────────────────────────────────
    // Keep User.supervisorId in sync for backward compatibility.
    // Only applies to PRIMARY DIRECT relationships.
    if (isPrimary && type === 'DIRECT') {
        await prisma.user.update({
            where: { id: employeeId },
            data: { supervisorId: managerId },
        });
    }
    return reporting;
};
exports.assignReporting = assignReporting;
/**
 * Migrate existing supervisorId data into the new EmployeeReporting table.
 * This is a one-time, idempotent migration helper.
 */
const migrateSupervisorIds = async (organizationId) => {
    const employees = await prisma.user.findMany({
        where: { organizationId, supervisorId: { not: null } },
        select: { id: true, supervisorId: true },
    });
    let migrated = 0;
    for (const emp of employees) {
        if (!emp.supervisorId)
            continue;
        try {
            await prisma.employeeReporting.upsert({
                where: { employeeId_managerId_type: { employeeId: emp.id, managerId: emp.supervisorId, type: 'DIRECT' } },
                create: { organizationId, employeeId: emp.id, managerId: emp.supervisorId, type: 'DIRECT', isPrimary: true },
                update: {},
            });
            migrated++;
        }
        catch { /* skip if already exists */ }
    }
    return { migrated, total: employees.length };
};
exports.migrateSupervisorIds = migrateSupervisorIds;
