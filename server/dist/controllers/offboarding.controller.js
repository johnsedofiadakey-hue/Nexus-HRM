"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackAssetReturn = exports.updateExitInterview = exports.completeOffboarding = exports.getOffboardingList = exports.initiateOffboarding = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
/**
 * EXIT & SEPARATION (OFFBOARDING) CONTROLLER
 */
const initiateOffboarding = async (req, res) => {
    try {
        const { employeeId, effectiveDate, reason } = req.body;
        const organizationId = req.user?.organizationId || 'default-tenant';
        const triggeredById = req.user?.id;
        const process = await client_1.default.offboardingProcess.create({
            data: {
                organizationId,
                employeeId,
                triggeredById,
                effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
                status: 'INITIATED'
            }
        });
        // Create exit interview placeholder
        await client_1.default.exitInterview.create({
            data: {
                organizationId,
                offboardingId: process.id,
                reason
            }
        });
        await (0, audit_service_1.logAction)(triggeredById, 'INITIATE_OFFBOARDING', 'User', employeeId, { processId: process.id }, req.ip);
        await (0, websocket_service_1.notify)(employeeId, 'Offboarding Commenced 🚪', `Your offboarding process has been initiated, effective ${effectiveDate || 'soon'}.`, 'WARNING', '/offboarding');
        res.status(201).json(process);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.initiateOffboarding = initiateOffboarding;
const getOffboardingList = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'default-tenant';
        const list = await client_1.default.offboardingProcess.findMany({
            where: { organizationId },
            include: {
                employee: { select: { fullName: true, employeeCode: true, jobTitle: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getOffboardingList = getOffboardingList;
const completeOffboarding = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId || 'default-tenant';
        const process = await client_1.default.offboardingProcess.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                accountDisabledAt: new Date()
            }
        });
        // Deactivate user account
        await client_1.default.user.update({
            where: { id: process.employeeId },
            data: { status: 'TERMINATED' }
        });
        await (0, audit_service_1.logAction)(req.user?.id, 'COMPLETE_OFFBOARDING', 'User', process.employeeId, { processId: id }, req.ip);
        res.json(process);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.completeOffboarding = completeOffboarding;
const updateExitInterview = async (req, res) => {
    try {
        const { offboardingId } = req.params;
        const { interviewerId, interviewDate, feedback, rehireEligible } = req.body;
        const interview = await client_1.default.exitInterview.updateMany({
            where: { offboardingId },
            data: {
                interviewerId,
                interviewDate: interviewDate ? new Date(interviewDate) : null,
                feedback,
                rehireEligible
            }
        });
        res.json(interview);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateExitInterview = updateExitInterview;
const trackAssetReturn = async (req, res) => {
    try {
        const { offboardingId, assetId, conditionNotes } = req.body;
        const organizationId = req.user?.organizationId || 'default-tenant';
        const returnRecord = await client_1.default.assetReturn.create({
            data: {
                organizationId,
                offboardingId,
                assetId,
                returned: true,
                returnedAt: new Date(),
                conditionNotes
            }
        });
        res.status(201).json(returnRecord);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.trackAssetReturn = trackAssetReturn;
