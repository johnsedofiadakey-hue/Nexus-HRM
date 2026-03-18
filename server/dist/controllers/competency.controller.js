"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompetency = exports.updateCompetency = exports.createCompetency = exports.getCompetencies = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const audit_service_1 = require("../services/audit.service");
const getCompetencies = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const competencies = await client_1.default.competency.findMany({
            where: { organizationId: orgId },
            orderBy: { name: 'asc' }
        });
        res.json(competencies);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCompetencies = getCompetencies;
const createCompetency = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const { name, description, weight } = req.body;
        const user = req.user;
        const competency = await client_1.default.competency.create({
            data: {
                organizationId: orgId,
                name,
                description,
                weight: parseFloat(weight) || 1.0
            }
        });
        await (0, audit_service_1.logAction)(user.id, 'COMPETENCY_CREATE', 'Competency', competency.id, { name }, req.ip);
        res.status(201).json(competency);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.createCompetency = createCompetency;
const updateCompetency = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const { id } = req.params;
        const { name, description, weight } = req.body;
        const user = req.user;
        const competency = await client_1.default.competency.update({
            where: { id, organizationId: orgId },
            data: {
                name,
                description,
                weight: parseFloat(weight) || 1.0
            }
        });
        await (0, audit_service_1.logAction)(user.id, 'COMPETENCY_UPDATE', 'Competency', competency.id, { name }, req.ip);
        res.json(competency);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateCompetency = updateCompetency;
const deleteCompetency = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const { id } = req.params;
        const user = req.user;
        // Check if it's used in any ratings
        const usage = await client_1.default.appraisalRating.count({
            where: { competencyId: id }
        });
        if (usage > 0) {
            return res.status(400).json({ error: "Cannot delete competency as it is currently in use by existing appraisals." });
        }
        await client_1.default.competency.delete({
            where: { id, organizationId: orgId }
        });
        await (0, audit_service_1.logAction)(user.id, 'COMPETENCY_DELETE', 'Competency', id, {}, req.ip);
        res.json({ message: "Competency deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.deleteCompetency = deleteCompetency;
