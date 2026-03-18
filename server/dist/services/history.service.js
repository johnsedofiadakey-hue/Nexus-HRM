"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHistoryStatus = exports.getHistoryByEmployee = exports.createHistory = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createHistory = async (data) => {
    return prisma.employeeHistory.create({
        data: {
            employeeId: data.employeeId,
            loggedById: data.loggedById,
            type: data.type,
            title: data.title,
            description: data.description,
            change: data.description || data.title,
            severity: data.severity || 'LOW',
            status: data.status || 'OPEN'
        },
        include: { loggedBy: { select: { fullName: true, jobTitle: true } } }
    });
};
exports.createHistory = createHistory;
const getHistoryByEmployee = async (employeeId) => {
    return prisma.employeeHistory.findMany({
        where: { employeeId },
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { fullName: true, id: true } } }
    });
};
exports.getHistoryByEmployee = getHistoryByEmployee;
const updateHistoryStatus = async (id, status) => {
    return prisma.employeeHistory.update({
        where: { id },
        data: { status }
    });
};
exports.updateHistoryStatus = updateHistoryStatus;
