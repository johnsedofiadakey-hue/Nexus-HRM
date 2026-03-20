"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewTarget = exports.updateProgress = exports.acknowledge = exports.cascadeTarget = exports.createTarget = void 0;
const target_service_1 = require("../services/target.service");
const enterprise_controller_1 = require("./enterprise.controller");
const createTarget = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const originatorId = req.user.id;
        const target = await target_service_1.TargetService.createTarget(req.body, originatorId, orgId);
        return res.status(201).json(target);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.createTarget = createTarget;
const cascadeTarget = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const managerId = req.user.id;
        const { parentTargetId, assignments } = req.body;
        const targets = await target_service_1.TargetService.cascadeTarget(parentTargetId, assignments, managerId, orgId);
        return res.status(201).json(targets);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.cascadeTarget = cascadeTarget;
const acknowledge = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userId = req.user.id;
        const { targetId, status, message } = req.body;
        const target = await target_service_1.TargetService.acknowledge(targetId, userId, orgId, status, message);
        return res.json(target);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.acknowledge = acknowledge;
const updateProgress = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const userId = req.user.id;
        const { targetId, metricUpdates, submit } = req.body;
        const target = await target_service_1.TargetService.updateProgress(targetId, metricUpdates, userId, orgId, submit);
        return res.json(target);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.updateProgress = updateProgress;
const reviewTarget = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req) || 'default-tenant';
        const reviewerId = req.user.id;
        const { targetId, approved, feedback } = req.body;
        const target = await target_service_1.TargetService.reviewTarget(targetId, reviewerId, orgId, approved, feedback);
        return res.json(target);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
};
exports.reviewTarget = reviewTarget;
