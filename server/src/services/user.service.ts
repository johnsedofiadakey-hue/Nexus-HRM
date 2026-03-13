import { PrismaClient } from '@prisma/client';
type User = any;
import bcrypt from 'bcryptjs';
import { maybeEncrypt } from '../utils/encryption';

const prisma = new PrismaClient();

const resolveDepartmentId = async (organizationId: string, department?: string, departmentId?: number) => {
    if (departmentId) return departmentId;
    if (!department || typeof department !== 'string') return undefined;
    const name = department.trim();
    if (!name) return undefined;

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

    const resolvedDepartmentId = await resolveDepartmentId(organizationId, data.department, data.departmentId);

    return prisma.user.create({
        data: {
            organizationId,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            departmentId: resolvedDepartmentId ?? data.departmentId ?? undefined,
            jobTitle: data.jobTitle,
            passwordHash,
            employeeCode: data.employeeCode,
            status: data.status || 'ACTIVE',
            position: data.position || data.jobTitle,
            joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
            supervisorId: data.supervisorId || null,

            // Personal Details
            dob: data.dob ? new Date(data.dob) : undefined,
            gender: data.gender,
            nationalId: data.nationalId,
            contactNumber: data.contactNumber,
            address: data.address,

            // Next of Kin
            nextOfKinName: data.nextOfKinName,
            nextOfKinRelation: data.nextOfKinRelation,
            nextOfKinContact: data.nextOfKinContact,

            // Compensation (MD only usually, but allowed on create here)
            salary: data.salary || undefined,
            currency: data.currency || 'GHS',
            bankAccountEnc: maybeEncrypt(data.bankAccountNumber),
            ghanaCardEnc: maybeEncrypt(data.nationalId),
            ssnitEnc: maybeEncrypt(data.ssnitNumber),
            salaryEnc: maybeEncrypt(data.salary)
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

export const getAllUsers = async (organizationId: string, filter?: { department?: string, role?: string, status?: string } & any) => {
    const where = { ...filter, organizationId };
    return prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            departmentId: true,
            departmentObj: { select: { name: true } },
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
    const { password, passwordHash, department, departmentId, ...safeData } = data as any;

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

    if (safeData.bankAccountNumber !== undefined) safeData.bankAccountEnc = maybeEncrypt(safeData.bankAccountNumber);
    if (safeData.nationalId !== undefined) safeData.ghanaCardEnc = maybeEncrypt(safeData.nationalId);
    if (safeData.ssnitNumber !== undefined) safeData.ssnitEnc = maybeEncrypt(safeData.ssnitNumber);
    if (safeData.salary !== undefined && safeData.salary !== null) safeData.salaryEnc = maybeEncrypt(String(safeData.salary));

    return prisma.user.update({
        where: { id },
        data: {
            ...safeData,
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
