import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const resolveDepartmentId = async (department?: string, departmentId?: number) => {
    if (departmentId) return departmentId;
    if (!department) return undefined;
    const name = department.trim();
    if (!name) return undefined;

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) return existing.id;

    const created = await prisma.department.create({ data: { name } });
    return created.id;
};

export const createUser = async (data: {
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
}) => {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error('User with this email already exists');

    if (data.employeeCode) {
        const existingCode = await prisma.user.findUnique({ where: { employeeCode: data.employeeCode } });
        if (existingCode) throw new Error('User with this Employee Code already exists');
    }

    // Default password generation
    const plainPassword = data.password || 'Nexus123!';
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const resolvedDepartmentId = await resolveDepartmentId(data.department, data.departmentId);

    return prisma.user.create({
        data: {
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
            currency: data.currency || 'GHS'
        },
    });
};

export const getUserById = async (id: string) => {
    return prisma.user.findUnique({
        where: { id },
        include: {
            supervisor: { select: { id: true, fullName: true, email: true } },
            subordinates: { select: { id: true, fullName: true, jobTitle: true } },
            departmentObj: { select: { name: true } }
        }
    });
};

export const getAllUsers = async (filter?: { department?: string, role?: string, status?: string }) => {
    return prisma.user.findMany({
        where: filter,
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
    id: string,
    data: Partial<User> & { dob?: string | Date, joinDate?: string | Date, department?: string, departmentId?: number }
) => {
    // Exclude password from direct update here usually
    const { passwordHash, department, departmentId, ...safeData } = data as any;

    const resolvedDepartmentId = await resolveDepartmentId(department, departmentId);
    if (resolvedDepartmentId !== undefined) {
        safeData.departmentId = resolvedDepartmentId;
    }

    if (safeData.dob) safeData.dob = new Date(safeData.dob);
    if (safeData.joinDate) safeData.joinDate = new Date(safeData.joinDate);
    if (safeData.salary === '') safeData.salary = null;

    return prisma.user.update({
        where: { id },
        data: safeData
    });
};

export const deleteUser = async (id: string) => {
    // Soft delete (Archive)
    return prisma.user.update({
        where: { id },
        data: { 
            status: 'ARCHIVED',
            isArchived: true,
            archivedDate: new Date()
        }
    });
};

export const hardDeleteUser = async (id: string) => {
    // True destructive hard delete
    return prisma.user.delete({
        where: { id }
    });
};
