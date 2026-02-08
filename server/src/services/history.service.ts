import { PrismaClient, EmployeeHistory, HistoryType, Severity, HistoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const createHistory = async (data: {
    employeeId: string;
    loggedById: string;
    type: HistoryType;
    title: string;
    description: string;
    severity?: Severity;
    status?: HistoryStatus;
}) => {
    return prisma.employeeHistory.create({
        data: {
            employeeId: data.employeeId,
            loggedById: data.loggedById,
            type: data.type,
            title: data.title,
            description: data.description,
            severity: data.severity || 'LOW',
            status: data.status || 'OPEN'
        },
        include: { loggedBy: { select: { fullName: true, jobTitle: true } } }
    });
};

export const getHistoryByEmployee = async (employeeId: string) => {
    return prisma.employeeHistory.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { fullName: true, id: true } } }
    });
};

export const updateHistoryStatus = async (id: string, status: HistoryStatus) => {
    return prisma.employeeHistory.update({
        where: { id },
        data: { status }
    });
};
