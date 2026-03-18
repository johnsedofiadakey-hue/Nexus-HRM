"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamAppraisals = exports.submitManager = exports.submitSelf = exports.getMyLatest = exports.initiateCycle = void 0;
const appraisalService = __importStar(require("../services/appraisal.service"));
const audit_service_1 = require("../services/audit.service");
const client_1 = __importDefault(require("../prisma/client"));
const sms_service_1 = require("../services/sms.service");
const enterprise_controller_1 = require("./enterprise.controller");
const initiateCycle = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const user = req.user;
        const { cycleId, employeeIds } = req.body;
        const results = await appraisalService.initAppraisalCycle(organizationId, cycleId, employeeIds);
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_CYCLE_INIT', 'Cycle', cycleId, { count: results.length }, req.ip);
        res.status(201).json({ message: `Initiated ${results.length} appraisals`, data: results });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.initiateCycle = initiateCycle;
const getMyLatest = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const user = req.user;
        const userId = user.id;
        const start = Date.now();
        const appraisal = await appraisalService.getMyAppraisal(organizationId, userId, req.query.cycleId);
        console.log(`[PERF] getMyAppraisal for ${userId} took ${Date.now() - start}ms`);
        if (!appraisal)
            return res.status(200).json(null);
        const role = user.role;
        if (role === 'STAFF' || role === 'CASUAL' && appraisal.status !== 'COMPLETED') {
            const sanitized = {
                ...appraisal,
                ratings: appraisal.ratings.map((rating) => ({
                    ...rating,
                    managerScore: null,
                    managerComment: null
                }))
            };
            return res.json(sanitized);
        }
        res.json(appraisal);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyLatest = getMyLatest;
const submitSelf = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const userId = userReq.id;
        const { appraisalId, ratings } = req.body;
        const result = await appraisalService.submitSelfRating(organizationId, userId, appraisalId, ratings);
        await (0, audit_service_1.logAction)(userId, 'APPRAISAL_SELF_SUBMIT', 'Appraisal', appraisalId, { ratingCount: ratings.length }, req.ip);
        // Notify Manager via SMS/WhatsApp
        const user = await client_1.default.user.findFirst({
            where: { id: userId, organizationId },
            include: { supervisor: true }
        });
        if (user?.supervisor?.contactNumber) {
            (0, sms_service_1.sendSMS)({
                to: user.supervisor.contactNumber,
                message: `Nexus HRM: ${user.fullName} has submitted their self-appraisal. Awaiting your review.`
            }).catch(err => console.error('SMS error:', err));
        }
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitSelf = submitSelf;
const submitManager = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const reviewerId = user.id;
        const { appraisalId, ratings } = req.body;
        const result = await appraisalService.submitManagerReview(organizationId, reviewerId, appraisalId, ratings);
        await (0, audit_service_1.logAction)(reviewerId, 'APPRAISAL_MANAGER_REVIEW', 'Appraisal', appraisalId, { ratingCount: ratings.length }, req.ip);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitManager = submitManager;
const getTeamAppraisals = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const managerId = user.id;
        const role = user.role;
        const appraisals = await appraisalService.getTeamAppraisals(organizationId, managerId, role);
        res.json(appraisals);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTeamAppraisals = getTeamAppraisals;
