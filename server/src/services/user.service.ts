import prisma from '../prisma/client';
type User = any;
import bcrypt from 'bcryptjs';
import { maybeEncrypt } from '../utils/encryption';

const resolveDepartmentId = async (organizationId: string, department?: string, departmentId?: number) => {
    if (departmentId) return departmentId;
    if (!department || typeof department !== 'string') return undefined;
    
    const name = department.trim();
    if (!name) return undefined;

    // 🛡️ CRITICAL FIX: If the 'name' is actually a numeric string (e.g. "1", "2"),
    // it was likely a departmentId sent to the wrong field. Do NOT create a department named "1".
    if (/^\d+$/.test(name)) {
        return parseInt(name);
    }

    const existing = await prisma.department.findFirst({
        where: { name, organizationId }
    });
    if (existing) return existing.id;

    const created = await prisma.department.create({
        data: { name, organizationId }
    });
    return created.id;
};

export const createUser = async (organizationId: string, data: {
    email: string;
    fullName: string;
    role: string;
    department?: string;
    departmentId?: number;
    jobTitle: string;
    employeeCode?: string;
    status?: string;
    position?: string;
    joinDate?: Date | string;
    supervisorId?: string;
    password?: string;
    // New Fields
    dob?: Date | string;
    gender?: string;
    nationalId?: string;
    contactNumber?: string;
    address?: string;
    nextOfKinName?: string;
    nextOfKinRelation?: string;
    nextOfKinContact?: string;
    salary?: number;
    currency?: any;
    bankAccountNumber?: string;
    ssnitNumber?: string;
    subUnitId?: string;
} & any) => {
    const existingUser = await prisma.user.findFirst({ where: { email: data.email, organizationId } });
    if (existingUser) throw new Error('User with this email already exists');

    if (data.employeeCode) {
        const existingCode = await prisma.user.findFirst({
            where: { employeeCode: data.employeeCode, organizationId }
        });
        if (existingCode) throw new Error('User with this Employee Code already exists');
    }

    // Default password generation
    const plainPassword = data.password || 'Nexus123!';
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // Standardize empty strings to null for optional fields (like employeeCode)
    const safeData = { ...data };
    for (const key of Object.keys(safeData)) {
        if (safeData[key] === '') {
            safeData[key] = null;
        }
    }

    const resolvedDepartmentId = await resolveDepartmentId(organizationId, safeData.department, safeData.departmentId);

    return prisma.user.create({
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
            bankAccountEnc: maybeEncrypt(safeData.bankAccountNumber),
            ghanaCardEnc: maybeEncrypt(safeData.nationalId),
            ssnitEnc: maybeEncrypt(safeData.ssnitNumber),
            salaryEnc: maybeEncrypt(safeData.salary)
        },
    });
};

export const getUserById = async (organizationId: string, id: string) => {
    return prisma.user.findFirst({
        where: { id, organizationId },
        include: {
            supervisor: { select: { id: true, fullName: true, email: true } },
            subordinates: { select: { id: true, fullName: true, jobTitle: true } },
            departmentObj: { select: { name: true } }
        }
    });
};

export const getAllUsers = async (organizationId: string | null, filter?: { department?: string, role?: string, status?: string, take?: number } & any) => {
    const { take, ...where } = filter || {};
    if (organizationId) {
        where.organizationId = organizationId;
    }
    // If organizationId is null (e.g. for autonomous DEV), it returns all users across all organizations
    return prisma.user.findMany({
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

export const updateUser = async (
    organizationId: string,
    id: string,
    data: Partial<User> & { dob?: string | Date, joinDate?: string | Date, department?: string, departmentId?: number, password?: string }
) => {
    // Exclude password from direct update here usually
    const { password, passwordHash, department, departmentId, subUnitId, ...safeData } = data as any;

    const resolvedDepartmentId = await resolveDepartmentId(organizationId, department, departmentId);
    if (resolvedDepartmentId !== undefined) {
        safeData.departmentId = resolvedDepartmentId;
    }

    if (safeData.dob) safeData.dob = new Date(safeData.dob);
    if (safeData.joinDate) safeData.joinDate = new Date(safeData.joinDate);

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

    if (safeData.bankAccountNumber !== undefined) safeData.bankAccountEnc = maybeEncrypt(safeData.bankAccountNumber);
    if (safeData.nationalId !== undefined) safeData.ghanaCardEnc = maybeEncrypt(safeData.nationalId);
    if (safeData.ssnitNumber !== undefined) safeData.ssnitEnc = maybeEncrypt(safeData.ssnitNumber);
    if (safeData.salary !== undefined && safeData.salary !== null) safeData.salaryEnc = maybeEncrypt(String(safeData.salary));

    return prisma.user.update({
        where: { id },
        data: {
            ...safeData,
            subUnitId: subUnitId !== undefined ? subUnitId : safeData.subUnitId,
            organizationId // Ensure it doesn't change or is set
        }
    });
};

export const deleteUser = async (organizationId: string, id: string) => {
    // Soft delete (Archive)
    return prisma.user.updateMany({
        where: { id, organizationId },
        data: {
            status: 'ARCHIVED',
            isArchived: true,
            archivedDate: new Date()
        }
    });
};

export const hardDeleteUser = async (organizationId: string, id: string) => {
    // True destructive hard delete
    return prisma.user.deleteMany({
        where: { id, organizationId }
    });
};
