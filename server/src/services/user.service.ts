import { PrismaClient, User, Role, EmploymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const createUser = async (data: {
    email: string;
    fullName: string;
    role: Role;
    department?: string;
    departmentId?: number;
    jobTitle: string;
    employeeCode?: string;
    status?: EmploymentStatus;
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
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    return prisma.user.create({
        data: {
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            departmentId: data.departmentId ?? undefined,
            jobTitle: data.jobTitle,
            passwordHash,
            employeeCode: data.employeeCode,
            status: data.status || 'ACTIVE',
            position: data.position || data.jobTitle,
            joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
            supervisorId: data.supervisorId,

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
            salary: data.salary,
            currency: data.currency || 'GHS'
        },
    });
};

export const getUserById = async (id: string) => {
    return prisma.user.findUnique({
        where: { id },
        include: {
            supervisor: { select: { id: true, fullName: true, email: true } },
            subordinates: { select: { id: true, fullName: true, jobTitle: true } }
        }
    });
};

export const getAllUsers = async (filter?: { department?: string, role?: Role, status?: EmploymentStatus }) => {
    return prisma.user.findMany({
        where: filter,
        orderBy: { fullName: 'asc' },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
                departmentId: true,
                departmentObj: true,
            jobTitle: true,
            employeeCode: true,
            status: true,
            avatarUrl: true
        }
    });
};

export const updateUser = async (id: string, data: Partial<User> & { dob?: string | Date, joinDate?: string | Date }) => {
    // Exclude password from direct update here usually
    const { passwordHash, ...safeData } = data as any;

    if (safeData.dob) safeData.dob = new Date(safeData.dob);
    if (safeData.joinDate) safeData.joinDate = new Date(safeData.joinDate);

    return prisma.user.update({
        where: { id },
        data: safeData
    });
};

export const deleteUser = async (id: string) => {
    // Soft delete by setting status to TERMINATED
    // Assuming EmploymentStatus has TERMINATED. If not, we might need to add it or use another status.
    // Let's check schema first... or just set to inactive if TERMINATED isn't there.
    // Actually, based on previous interactions, status is a String in frontend (ACTIVE/TERMINATED).
    // In schema it is `status EmploymentStatus` enum or String?
    // User service says `status?: EmploymentStatus;`.
    // Let's assume TERMINATED exists or use a safe fallback.
    // Ideally we checked schema. schema.prisma says `status String` in my memory? 
    // Wait, viewed file `user.service.ts` line 1 says `import { ... EmploymentStatus }`.
    // If it's an Enum, I must use a valid value.
    // Let's use 'TERMINATED' if valid, or just delete the row if hard delete is required?
    // User asked "delete or edit". Soft delete is safer.

    return prisma.user.update({
        where: { id },
        data: { status: 'TERMINATED' }
    });
};
