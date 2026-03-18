"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCycle = exports.updateCycle = exports.getCycleById = exports.getCycles = exports.createCycle = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createCycle = async (data) => {
    return prisma.cycle.create({
        data: {
            name: data.name,
            type: data.type,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            status: 'DRAFT',
        },
    });
};
exports.createCycle = createCycle;
const getCycles = async (filter) => {
    return prisma.cycle.findMany({
        where: filter,
        orderBy: { startDate: 'desc' },
    });
};
exports.getCycles = getCycles;
const getCycleById = async (id) => {
    return prisma.cycle.findUnique({
        where: { id },
    });
};
exports.getCycleById = getCycleById;
const updateCycle = async (id, data) => {
    const updateData = { ...data };
    if (data.startDate)
        updateData.startDate = new Date(data.startDate);
    if (data.endDate)
        updateData.endDate = new Date(data.endDate);
    return prisma.cycle.update({
        where: { id },
        data: updateData,
    });
};
exports.updateCycle = updateCycle;
const deleteCycle = async (id) => {
    return prisma.cycle.delete({ where: { id } });
};
exports.deleteCycle = deleteCycle;
