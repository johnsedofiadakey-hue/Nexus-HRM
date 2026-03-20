"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalSignOff = exports.getFinalVerdictList = exports.getTeamPackets = exports.getMyPackets = exports.getPacketDetail = exports.submitAppraisalReview = exports.initAppraisalCycle = void 0;
const appraisal_service_1 = require("../services/appraisal.service");
const enterprise_controller_1 = require("./enterprise.controller");
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
