"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteUser = exports.deleteUser = exports.updateUser = exports.getAllUsers = exports.getUserById = exports.createUser = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const encryption_1 = require("../utils/encryption");
const resolveDepartmentId = async (organizationId, department, departmentId) => {
    if (departmentId)
        return departmentId;
    if (!department || typeof department !== 'string')
        return undefined;
    const name = department.trim();
    if (!name)
        return undefined;
    // 🛡️ CRITICAL FIX: If the 'name' is actually a numeric string (e.g. "1", "2"),
    // it was likely a departmentId sent to the wrong field. Do NOT create a department named "1".
    if (/^\d+$/.test(name)) {
        return parseInt(name);
    }
    const existing = await client_1.default.department.findFirst({
        where: { name, organizationId }
    });
    if (existing)
        return existing.id;
    const created = await client_1.default.department.create({
        data: { name, organizationId }
    });
    return created.id;
};
const createUser = async (organizationId, data) => {
    const existingUser = await client_1.default.user.findFirst({ where: { email: data.email, organizationId } });
    if (existingUser)
        throw new Error('User with this email already exists');
    if (data.employeeCode) {
        const existingCode = await client_1.default.user.findFirst({
            where: { employeeCode: data.employeeCode, organizationId }
        });
        if (existingCode)
            throw new Error('User with this Employee Code already exists');
    }
    // Default password generation
    const plainPassword = data.password || 'Nexus123!';
    const passwordHash = await bcryptjs_1.default.hash(plainPassword, 12);
    // Standardize empty strings to null for optional fields (like employeeCode)
    const safeData = { ...data };
    for (const key of Object.keys(safeData)) {
        if (safeData[key] === '') {
            safeData[key] = null;
        }
    }
    const resolvedDepartmentId = await resolveDepartmentId(organizationId, safeData.department, safeData.departmentId);
    return client_1.default.user.create({
        data: {
            organizationId,
            email: safeData.email,
            fullName: safeData.fullName,
            role: safeData.role,
            departmentId: resolvedDepartmentId ?? safeData.departmentId ?? undefined,
            jobTitle: safeData.jobTitle,
            passwordHash,
            employeeCode: safeData.employeeCode,
            status: safeData.status || 'ACTIVE',
            position: safeData.position || safeData.jobTitle,
            joinDate: safeData.joinDate ? new Date(safeData.joinDate) : undefined,
            supervisorId: safeData.supervisorId || null,
            subUnitId: safeData.subUnitId || null,
            // Personal Details
            dob: safeData.dob ? new Date(safeData.dob) : undefined,
            gender: safeData.gender,
            nationalId: safeData.nationalId,
            contactNumber: safeData.contactNumber,
            address: safeData.address,
            // Next of Kin
            nextOfKinName: safeData.nextOfKinName,
            nextOfKinRelation: safeData.nextOfKinRelation,
            nextOfKinContact: safeData.nextOfKinContact,
            // Compensation (MD only usually, but allowed on create here)
            salary: safeData.salary || undefined,
            currency: safeData.currency || 'GHS',
            leaveBalance: 24,
            leaveAllowance: 24,
            bankAccountEnc: (0, encryption_1.maybeEncrypt)(safeData.bankAccountNumber),
            ghanaCardEnc: (0, encryption_1.maybeEncrypt)(safeData.nationalId),
            ssnitEnc: (0, encryption_1.maybeEncrypt)(safeData.ssnitNumber),
            salaryEnc: (0, encryption_1.maybeEncrypt)(safeData.salary)
        },
    });
};
exports.createUser = createUser;
const getUserById = async (organizationId, id) => {
    return client_1.default.user.findFirst({
        where: { id, organizationId },
        include: {
            supervisor: { select: { id: true, fullName: true, email: true } },
            subordinates: { select: { id: true, fullName: true, jobTitle: true } },
            departmentObj: { select: { name: true } }
        }
    });
};
exports.getUserById = getUserById;
const getAllUsers = async (organizationId, filter) => {
    const { take, ...where } = filter || {};
    if (organizationId) {
        where.organizationId = organizationId;
    }
    // If organizationId is null (e.g. for autonomous DEV), it returns all users across all organizations
    return client_1.default.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        take: take || 100,
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            departmentId: true,
            departmentObj: { select: { name: true } },
            subUnitId: true,
            subUnit: { select: { name: true } },
            jobTitle: true,
            employeeCode: true,
            status: true,
            avatarUrl: true
        }
    });
};
exports.getAllUsers = getAllUsers;
const updateUser = async (organizationId, id, data) => {
    // Exclude password from direct update here usually
    const { password, passwordHash, department, departmentId, subUnitId, ...safeData } = data;
    const resolvedDepartmentId = await resolveDepartmentId(organizationId, department, departmentId);
    if (resolvedDepartmentId !== undefined) {
        safeData.departmentId = resolvedDepartmentId;
    }
    if (safeData.dob)
        safeData.dob = new Date(safeData.dob);
    if (safeData.joinDate)
        safeData.joinDate = new Date(safeData.joinDate);
    // Automatically convert empty strings to null to prevent Prisma validation crashes
    for (const key of Object.keys(safeData)) {
        if (safeData[key] === '') {
            safeData[key] = null;
        }
    }
    // Strip relation and injected fields to prevent Prisma validation crashes
    delete safeData.departmentObj;
    delete safeData.supervisor;
    delete safeData.subordinates;
    delete safeData.kpiSheets;
    delete safeData.riskScore;
    delete safeData.createdAt;
    delete safeData.updatedAt;
    delete safeData.avatarUrl; // Handled separately via upload
    delete safeData.subUnit;
    if (safeData.bankAccountNumber !== undefined)
        safeData.bankAccountEnc = (0, encryption_1.maybeEncrypt)(safeData.bankAccountNumber);
    if (safeData.nationalId !== undefined)
        safeData.ghanaCardEnc = (0, encryption_1.maybeEncrypt)(safeData.nationalId);
    if (safeData.ssnitNumber !== undefined)
        safeData.ssnitEnc = (0, encryption_1.maybeEncrypt)(safeData.ssnitNumber);
    if (safeData.salary !== undefined && safeData.salary !== null)
        safeData.salaryEnc = (0, encryption_1.maybeEncrypt)(String(safeData.salary));
    return client_1.default.user.update({
        where: { id },
        data: {
            ...safeData,
            subUnitId: subUnitId !== undefined ? subUnitId : safeData.subUnitId,
            organizationId // Ensure it doesn't change or is set
        }
    });
};
exports.updateUser = updateUser;
const deleteUser = async (organizationId, id) => {
    // Soft delete (Archive)
    return client_1.default.user.updateMany({
        where: { id, organizationId },
        data: {
            status: 'ARCHIVED',
            isArchived: true,
            archivedDate: new Date()
        }
    });
};
exports.deleteUser = deleteUser;
const hardDeleteUser = async (organizationId, id) => {
    // True destructive hard delete
    return client_1.default.user.deleteMany({
        where: { id, organizationId }
    });
};
exports.hardDeleteUser = hardDeleteUser;
