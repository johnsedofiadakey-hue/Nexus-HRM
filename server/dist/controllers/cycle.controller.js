"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCycleStatus = exports.getCycles = exports.createCycle = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const createCycle = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { name, type, startDate, endDate } = req.body;
        const cycle = await client_1.default.cycle.create({
            data: {
                name,
                type: type || 'QUARTERLY',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                organizationId,
                status: 'DRAFT'
            },
        });
        res.status(201).json(cycle);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createCycle = createCycle;
const getCycles = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const cycles = await client_1.default.cycle.findMany({
            where: { organizationId },
            orderBy: { startDate: 'desc' },
        });
        res.json(cycles);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCycles = getCycles;
const updateCycleStatus = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { id } = req.params;
        const { status } = req.body;
        const cycle = await client_1.default.cycle.update({
            where: { id, organizationId },
            data: { status },
        });
        res.json(cycle);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateCycleStatus = updateCycleStatus;
