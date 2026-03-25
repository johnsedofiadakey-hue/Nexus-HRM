"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCyclePackets = exports.deleteAppraisalPacket = exports.updateAppraisalPacket = exports.deleteAppraisalCycle = exports.updateAppraisalCycle = exports.cancelAppraisalPacket = exports.finalSignOff = exports.getFinalVerdictList = exports.getTeamPackets = exports.getMyPackets = exports.getPacketDetail = exports.submitAppraisalReview = exports.initAppraisalCycle = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const appraisal_service_1 = require("../services/appraisal.service");
const enterprise_controller_1 = require("./enterprise.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
// Local helper
const audit_service_1 = require("../services/audit.service");
const initAppraisalCycle = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const cycle = await appraisal_service_1.AppraisalService.initCycle(organizationId, req.body);
        await (0, audit_service_1.logAction)(req.user.id, 'APPRAISAL_CYCLE_INIT', 'AppraisalCycle', cycle.id, {}, req.ip);
        return res.status(201).json(cycle);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.initAppraisalCycle = initAppraisalCycle;
const submitAppraisalReview = async (req, res) => {
    try {
        const { packetId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userId = req.user.id;
        const review = await appraisal_service_1.AppraisalService.submitReview(packetId, userId, organizationId, req.body);
        await (0, audit_service_1.logAction)(userId, 'APPRAISAL_REVIEW_SUBMITTED', 'AppraisalReview', review.id, { packetId }, req.ip);
        return res.json(review);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.submitAppraisalReview = submitAppraisalReview;
const getPacketDetail = async (req, res) => {
    try {
        const { packetId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const packet = await appraisal_service_1.AppraisalService.getPacketDetail(packetId, organizationId);
        if (!packet)
            return res.status(404).json({ error: 'Appraisal packet not found' });
        return res.json(packet);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getPacketDetail = getPacketDetail;
const getMyPackets = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userId = req.user.id;
        const packets = await appraisal_service_1.AppraisalService.getEmployeePackets(userId, organizationId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getMyPackets = getMyPackets;
const getTeamPackets = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userId = req.user.id;
        const packets = await appraisal_service_1.AppraisalService.getReviewerPackets(userId, organizationId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getTeamPackets = getTeamPackets;
const getFinalVerdictList = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const packets = await appraisal_service_1.AppraisalService.getFinalVerdictList(organizationId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getFinalVerdictList = getFinalVerdictList;
const finalSignOff = async (req, res) => {
    try {
        const { packetId } = req.body;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userId = req.user.id;
        const packet = await appraisal_service_1.AppraisalService.finalizePacket(packetId, userId, organizationId);
        await (0, audit_service_1.logAction)(userId, 'APPRAISAL_FINALIZED', 'AppraisalPacket', packet.id, {}, req.ip);
        return res.json(packet);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.finalSignOff = finalSignOff;
// Cancel/void an appraisal packet (Director+ only)
const cancelAppraisalPacket = async (req, res) => {
    try {
        const { packetId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id: packetId, organizationId }
        });
        if (!packet)
            return res.status(404).json({ error: 'Packet not found' });
        await client_1.default.appraisalPacket.update({
            where: { id: packetId },
            data: { status: 'CANCELLED', currentStage: 'CANCELLED' }
        });
        await (0, audit_service_1.logAction)(req.user.id, 'APPRAISAL_CANCELLED', 'AppraisalPacket', packetId, {}, req.ip);
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.cancelAppraisalPacket = cancelAppraisalPacket;
const updateAppraisalCycle = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const cycle = await appraisal_service_1.AppraisalService.updateCycle(organizationId, id, req.body);
        return res.json(cycle);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.updateAppraisalCycle = updateAppraisalCycle;
const deleteAppraisalCycle = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        await appraisal_service_1.AppraisalService.deleteCycle(organizationId, id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.deleteAppraisalCycle = deleteAppraisalCycle;
const updateAppraisalPacket = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userRole = req.user.role;
        // Only Director+ can modify active packets
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 80) {
            return res.status(403).json({ error: 'Not authorised to modify appraisal packets' });
        }
        const packet = await appraisal_service_1.AppraisalService.updatePacket(organizationId, id, req.body);
        return res.json(packet);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.updateAppraisalPacket = updateAppraisalPacket;
const deleteAppraisalPacket = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userRole = req.user.role;
        if ((0, auth_middleware_1.getRoleRank)(userRole) < 80) {
            return res.status(403).json({ error: 'Not authorised to delete appraisal packets' });
        }
        await appraisal_service_1.AppraisalService.deletePacket(organizationId, id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.deleteAppraisalPacket = deleteAppraisalPacket;
const getCyclePackets = async (req, res) => {
    try {
        const { cycleId } = req.params;
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const packets = await appraisal_service_1.AppraisalService.getCyclePackets(organizationId, cycleId);
        return res.json(packets);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getCyclePackets = getCyclePackets;
