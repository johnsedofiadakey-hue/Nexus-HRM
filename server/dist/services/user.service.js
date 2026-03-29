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
    if (departmentId !== undefined)
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
    const newUser = await client_1.default.user.create({
        data: {
            organizationId,
            email: safeData.email,
            fullName: safeData.fullName,
            role: safeData.role,
            departmentId: resolvedDepartmentId !== undefined ? resolvedDepartmentId : (safeData.departmentId ?? undefined),
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
            education: safeData.education,
            nationalId: safeData.nationalId,
            contactNumber: safeData.contactNumber,
            address: safeData.address,
            hometown: safeData.hometown,
            maritalStatus: safeData.maritalStatus,
            bloodGroup: safeData.bloodGroup,
            certifications: (safeData.certifications && Array.isArray(safeData.certifications)) ? JSON.stringify(safeData.certifications) : safeData.certifications,
            // Family & SOS
            nextOfKinName: safeData.nextOfKinName,
            nextOfKinRelation: safeData.nextOfKinRelation,
            nextOfKinContact: safeData.nextOfKinContact,
            emergencyContactName: safeData.emergencyContactName,
            emergencyContactPhone: safeData.emergencyContactPhone,
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
    // ── PHASE 2 Sync: EmployeeReporting ─────────────────────────────
    // Create Primary Direct reporting line
    if (newUser.supervisorId) {
        await client_1.default.employeeReporting.upsert({
            where: { employeeId_managerId_type: { employeeId: newUser.id, managerId: newUser.supervisorId, type: 'DIRECT' } },
            create: { organizationId, employeeId: newUser.id, managerId: newUser.supervisorId, type: 'DIRECT', isPrimary: true },
            update: { isPrimary: true, effectiveTo: null }
        });
    }
    // Create Secondary Dotted reporting line
    if (safeData.secondarySupervisorId) {
        await client_1.default.employeeReporting.upsert({
            where: { employeeId_managerId_type: { employeeId: newUser.id, managerId: safeData.secondarySupervisorId, type: 'DOTTED' } },
            create: { organizationId, employeeId: newUser.id, managerId: safeData.secondarySupervisorId, type: 'DOTTED', isPrimary: false },
            update: { isPrimary: false, effectiveTo: null }
        });
    }
    return newUser;
};
exports.createUser = createUser;
const getUserById = async (organizationId, id) => {
    return client_1.default.user.findFirst({
        where: { id, organizationId },
        include: {
            supervisor: { select: { id: true, fullName: true, email: true } },
            subordinates: { select: { id: true, fullName: true, jobTitle: true } },
            departmentObj: { select: { name: true } },
            employeeReportingLines: {
                where: { effectiveTo: null },
                include: { manager: { select: { id: true, fullName: true } } }
            },
            historyLogs: {
                orderBy: { createdAt: 'desc' },
                include: { createdBy: { select: { fullName: true } } }
            },
            appraisalPackets: {
                include: {
                    cycle: true,
                    reviews: {
                        include: { reviewer: { select: { fullName: true, avatarUrl: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' }
            },
            targetsAssignedToMe: {
                include: { metrics: true, updates: { orderBy: { createdAt: 'desc' }, take: 5 } },
                orderBy: { updatedAt: 'desc' }
            }
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
            avatarUrl: true,
            supervisorId: true,
            employeeReportingLines: {
                where: { effectiveTo: null },
                select: { id: true, managerId: true, type: true, isPrimary: true }
            }
        }
    });
};
exports.getAllUsers = getAllUsers;
const updateUser = async (organizationId, id, data) => {
    // Exclude password from direct update here usually
    const { password, passwordHash, department, departmentId, ...safeData } = data;
    const resolvedDepartmentId = await resolveDepartmentId(organizationId, department, departmentId);
    if (resolvedDepartmentId !== undefined) {
        safeData.departmentId = resolvedDepartmentId;
    }
    if (safeData.dob && safeData.dob !== '')
        safeData.dob = new Date(safeData.dob);
    else if (safeData.dob === '')
        safeData.dob = null;
    if (safeData.joinDate && safeData.joinDate !== '')
        safeData.joinDate = new Date(safeData.joinDate);
    else if (safeData.joinDate === '')
        safeData.joinDate = null;
    if (safeData.salary !== undefined && safeData.salary !== null && safeData.salary !== '') {
        safeData.salary = Number(safeData.salary);
    }
    else if (safeData.salary === '') {
        safeData.salary = null;
    }
    if (safeData.leaveBalance !== undefined && safeData.leaveBalance !== null)
        safeData.leaveBalance = Number(safeData.leaveBalance);
    if (safeData.leaveAllowance !== undefined && safeData.leaveAllowance !== null)
        safeData.leaveAllowance = Number(safeData.leaveAllowance);
    // Hard delete restricted fields that should not be in the update payload
    delete safeData.id;
    delete safeData.organizationId;
    delete safeData.organization;
    delete safeData.passwordHash;
    delete safeData.password;
    delete safeData.subUnit;
    delete safeData.departmentObj;
    delete safeData.supervisor;
    delete safeData.subordinates;
    delete safeData.kpiSheets;
    delete safeData.riskScore;
    delete safeData.createdAt;
    delete safeData.updatedAt;
    // We remove avatarUrl from direct safeData object update NOT because we block it, 
    // but because prisma.user.update({...safeData}) might fail if avatarUrl is not exactly a string 
    // or if we want to ensure it's handled by the upload endpoint ONLY if provided as null/string here.
    // Actually, letting it pass through if it's a string is fine.
    // delete safeData.avatarUrl; // RESTORED: Allow pass-through if frontend sends it
    delete safeData.subUnit;
    if (safeData.bankAccountNumber !== undefined)
        safeData.bankAccountEnc = (0, encryption_1.maybeEncrypt)(String(safeData.bankAccountNumber || ''));
    if (safeData.nationalId !== undefined)
        safeData.ghanaCardEnc = (0, encryption_1.maybeEncrypt)(String(safeData.nationalId || ''));
    if (safeData.ssnitNumber !== undefined)
        safeData.ssnitEnc = (0, encryption_1.maybeEncrypt)(String(safeData.ssnitNumber || ''));
    if (safeData.salary !== undefined && safeData.salary !== null)
        safeData.salaryEnc = (0, encryption_1.maybeEncrypt)(String(safeData.salary));
    // Handle certifications array-to-string conversion
    if (Array.isArray(safeData.certifications)) {
        safeData.certifications = JSON.stringify(safeData.certifications);
    }
    // Explicitly nullify other potential empty strings
    for (const key of ['education', 'gender', 'contactNumber', 'employeeCode', 'nationalId', 'address', 'dob', 'bankAccountNumber', 'bankName', 'bankBranch', 'ssnitNumber', 'hometown', 'maritalStatus', 'bloodGroup', 'emergencyContactName', 'emergencyContactPhone', 'nextOfKinName', 'nextOfKinRelation', 'nextOfKinContact', 'subUnitId', 'secondarySupervisorId', 'supervisorId']) {
        if (safeData[key] === '')
            safeData[key] = null;
    }
    if (safeData.certifications !== undefined && Array.isArray(safeData.certifications))
        safeData.certifications = JSON.stringify(safeData.certifications);
    const extractedSecondarySupervisorId = safeData.secondarySupervisorId;
    delete safeData.secondarySupervisorId;
    const updatedUser = await client_1.default.user.update({
        where: { id },
        data: {
            ...safeData,
            organizationId // Ensure it doesn't change or is set
        }
    });
    // ── PHASE 2 Sync: EmployeeReporting ─────────────────────────────
    if (safeData.supervisorId !== undefined) {
        if (safeData.supervisorId) {
            // Deactivate ANY current primary direct manager that isn't the new one
            await client_1.default.employeeReporting.updateMany({
                where: {
                    employeeId: id,
                    organizationId,
                    type: 'DIRECT',
                    isPrimary: true,
                    managerId: { not: safeData.supervisorId }
                },
                data: { isPrimary: false, effectiveTo: new Date() }
            });
            await client_1.default.employeeReporting.upsert({
                where: { employeeId_managerId_type: { employeeId: id, managerId: safeData.supervisorId, type: 'DIRECT' } },
                create: { organizationId, employeeId: id, managerId: safeData.supervisorId, type: 'DIRECT', isPrimary: true },
                update: { isPrimary: true, effectiveTo: null }
            });
        }
        else {
            // Remove primary if explicit null
            await client_1.default.employeeReporting.updateMany({
                where: { employeeId: id, organizationId, isPrimary: true, type: 'DIRECT' },
                data: { effectiveTo: new Date(), isPrimary: false }
            });
        }
    }
    if (extractedSecondarySupervisorId !== undefined) {
        if (extractedSecondarySupervisorId) {
            await client_1.default.employeeReporting.upsert({
                where: { employeeId_managerId_type: { employeeId: id, managerId: extractedSecondarySupervisorId, type: 'DOTTED' } },
                create: { organizationId, employeeId: id, managerId: extractedSecondarySupervisorId, type: 'DOTTED', isPrimary: false },
                update: { isPrimary: false, effectiveTo: null }
            });
        }
        else {
            // Remove secondary if explicit null
            await client_1.default.employeeReporting.updateMany({
                where: { employeeId: id, organizationId, type: 'DOTTED' },
                data: { effectiveTo: new Date() }
            });
        }
    }
    return updatedUser;
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
