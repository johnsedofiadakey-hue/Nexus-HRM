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
exports.deleteAppraisalsByCycle = exports.deleteAppraisal = exports.getCycleStats = exports.submitFinalVerdict = exports.getFinalVerdictList = exports.getTeamAppraisals = exports.submitManager = exports.submitSelf = exports.getMyLatest = exports.initiateCycle = void 0;
const appraisalService = __importStar(require("../services/appraisal.service"));
const audit_service_1 = require("../services/audit.service");
const notification_service_1 = require("../services/notification.service");
const client_1 = __importDefault(require("../prisma/client"));
const sms_service_1 = require("../services/sms.service");
const enterprise_controller_1 = require("./enterprise.controller");
// ─── MD/HR: INITIATE A CYCLE ──────────────────────────────────────────────────
const initiateCycle = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const user = req.user;
        const { cycleId, employeeIds } = req.body;
        if (!cycleId) {
            return res.status(400).json({ message: 'cycleId is required' });
        }
        const result = await appraisalService.initAppraisalCycle(organizationId, cycleId, employeeIds);
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_CYCLE_INIT', 'Cycle', cycleId, { initiated: result.initiated, skipped: result.skipped, skippedNames: result.skippedNames }, req.ip);
        res.status(201).json({
            message: `Initiated ${result.initiated} appraisal(s).${result.skipped > 0 ? ` Skipped ${result.skipped} (no reviewer found): ${result.skippedNames.join(', ')}` : ''}`,
            ...result,
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.initiateCycle = initiateCycle;
// ─── STAFF: GET OWN APPRAISAL ─────────────────────────────────────────────────
const getMyLatest = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const user = req.user;
        const appraisal = await appraisalService.getMyAppraisal(organizationId, user.id, req.query.cycleId);
        if (!appraisal)
            return res.status(200).json(null);
        // Hide manager scores from staff until appraisal is completed
        const isStaffView = ['STAFF', 'CASUAL', 'INTERN'].includes(user.role) && appraisal.status !== 'COMPLETED';
        if (isStaffView) {
            return res.json({
                ...appraisal,
                ratings: appraisal.ratings.map((r) => ({
                    ...r,
                    managerScore: null,
                    managerComment: null,
                })),
            });
        }
        res.json(appraisal);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMyLatest = getMyLatest;
// ─── STAFF: SUBMIT SELF-ASSESSMENT ───────────────────────────────────────────
const submitSelf = async (req, res) => {
    try {
        const userReq = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { appraisalId, ratings, selfNotes } = req.body;
        if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
            return res.status(400).json({ message: 'Ratings are required' });
        }
        const result = await appraisalService.submitSelfRating(organizationId, userReq.id, appraisalId, ratings, selfNotes);
        await (0, audit_service_1.logAction)(userReq.id, 'APPRAISAL_SELF_SUBMIT', 'Appraisal', appraisalId, { ratingCount: ratings.length }, req.ip);
        // Notify the line manager + SMS
        const employee = await client_1.default.user.findUnique({
            where: { id: userReq.id },
            include: { supervisor: { select: { id: true, contactNumber: true } } },
        });
        if (employee?.supervisor?.id) {
            (0, notification_service_1.notifyAppraisalSubmitted)({
                organizationId,
                managerId: employee.supervisor.id,
                employeeName: employee.fullName,
                appraisalId,
            }).catch(() => { });
        }
        if (employee?.supervisor?.contactNumber) {
            (0, sms_service_1.sendSMS)({
                to: employee.supervisor.contactNumber,
                message: `Nexus HRM: ${employee.fullName} has submitted their self-appraisal and is awaiting your review.`,
            }).catch(() => { });
        }
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitSelf = submitSelf;
// ─── MANAGER: REVIEW TEAM MEMBER ─────────────────────────────────────────────
const submitManager = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { appraisalId, ratings, managerNotes } = req.body;
        if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
            return res.status(400).json({ message: 'Ratings are required' });
        }
        const result = await appraisalService.submitManagerReview(organizationId, user.id, appraisalId, ratings, managerNotes);
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_MANAGER_REVIEW', 'Appraisal', appraisalId, { ratingCount: ratings.length, score: result.finalScore }, req.ip);
        // Notify MD for final verdict
        const md = await client_1.default.user.findFirst({
            where: { organizationId, role: 'MD' },
            select: { id: true },
        });
        const appr = await client_1.default.appraisal.findUnique({
            where: { id: appraisalId },
            include: { employee: { select: { fullName: true } }, cycle: true }
        });
        if (md?.id && appr) {
            (0, notification_service_1.notifyFinalVerdictRequired)({
                organizationId,
                mdUserId: md.id,
                employeeName: appr.employee.fullName,
                cycleId: appr.cycleId,
            }).catch(() => { });
        }
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitManager = submitManager;
// ─── MANAGER: GET TEAM APPRAISALS ─────────────────────────────────────────────
const getTeamAppraisals = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const appraisals = await appraisalService.getTeamAppraisals(organizationId, user.id);
        res.json(appraisals);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTeamAppraisals = getTeamAppraisals;
// ─── MD/DIRECTOR: FINAL VERDICT LIST ─────────────────────────────────────────
const getFinalVerdictList = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const appraisals = await appraisalService.getAwaitingVerdictAppraisals(organizationId);
        res.json(appraisals);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getFinalVerdictList = getFinalVerdictList;
// ─── MD/DIRECTOR: SUBMIT FINAL VERDICT ───────────────────────────────────────
const submitFinalVerdict = async (req, res) => {
    try {
        const user = req.user;
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { appraisalId, mdNotes } = req.body;
        if (!appraisalId)
            return res.status(400).json({ message: 'appraisalId is required' });
        const result = await appraisalService.submitFinalVerdict(organizationId, user.id, appraisalId, mdNotes);
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_FINAL_VERDICT', 'Appraisal', appraisalId, { score: result.finalScore }, req.ip);
        // Notify the employee
        if (result.finalScore !== null) {
            const appraisal = await client_1.default.appraisal.findUnique({
                where: { id: appraisalId },
                include: { cycle: true },
            });
            if (appraisal) {
                (0, notification_service_1.notifyAppraisalCompleted)({
                    organizationId,
                    employeeId: appraisal.employeeId,
                    cycleName: appraisal.cycle?.name || 'Performance Review',
                    finalScore: result.finalScore,
                }).catch(() => { });
            }
        }
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.submitFinalVerdict = submitFinalVerdict;
// ─── CYCLE STATS ──────────────────────────────────────────────────────────────
const getCycleStats = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { cycleId } = req.params;
        const stats = await appraisalService.getCycleStats(organizationId, cycleId);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getCycleStats = getCycleStats;
// ─── DELETE APPRAISALS ───────────────────────────────────────────────────────
const deleteAppraisal = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { id } = req.params;
        await appraisalService.deleteAppraisal(organizationId, id);
        const user = req.user;
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_DELETE', 'Appraisal', id, {}, req.ip);
        res.json({ message: 'Appraisal deleted successfully' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteAppraisal = deleteAppraisal;
const deleteAppraisalsByCycle = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const organizationId = orgId || 'default-tenant';
        const { cycleId } = req.params;
        const result = await appraisalService.deleteAppraisalsByCycle(organizationId, cycleId);
        const user = req.user;
        await (0, audit_service_1.logAction)(user.id, 'APPRAISAL_CYCLE_WIPE', 'Cycle', cycleId, { count: result.count }, req.ip);
        res.json({ message: `Deleted ${result.count} appraisals for this cycle` });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteAppraisalsByCycle = deleteAppraisalsByCycle;
