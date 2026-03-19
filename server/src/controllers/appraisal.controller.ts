import { Request, Response } from 'express';
import * as appraisalService from '../services/appraisal.service';
import { logAction } from '../services/audit.service';
import { notifyAppraisalSubmitted, notifyFinalVerdictRequired, notifyAppraisalCompleted } from '../services/notification.service';
import prisma from '../prisma/client';
import { sendSMS } from '../services/sms.service';
import { getOrgId } from './enterprise.controller';

// ─── MD/HR: INITIATE A CYCLE ──────────────────────────────────────────────────

export const initiateCycle = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const user = (req as any).user;
        const { cycleId, employeeIds } = req.body;

        if (!cycleId) {
            return res.status(400).json({ message: 'cycleId is required' });
        }

        const result = await appraisalService.initAppraisalCycle(organizationId, cycleId, employeeIds);

        await logAction(
            user.id,
            'APPRAISAL_CYCLE_INIT',
            'Cycle',
            cycleId,
            { initiated: result.initiated, skipped: result.skipped, skippedNames: result.skippedNames },
            req.ip
        );

        res.status(201).json({
            message: `Initiated ${result.initiated} appraisal(s).${result.skipped > 0 ? ` Skipped ${result.skipped} (no reviewer found): ${result.skippedNames.join(', ')}` : ''}`,
            ...result,
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ─── STAFF: GET OWN APPRAISAL ─────────────────────────────────────────────────

export const getMyLatest = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const user = (req as any).user;
        const appraisal = await appraisalService.getMyAppraisal(organizationId, user.id, req.query.cycleId as string);

        if (!appraisal) return res.status(200).json(null);

        // Hide manager scores from staff until appraisal is completed
        const isStaffView = ['STAFF', 'CASUAL', 'INTERN'].includes(user.role) && appraisal.status !== 'COMPLETED';
        if (isStaffView) {
            return res.json({
                ...appraisal,
                ratings: appraisal.ratings.map((r: any) => ({
                    ...r,
                    managerScore: null,
                    managerComment: null,
                })),
            });
        }

        res.json(appraisal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── STAFF: SUBMIT SELF-ASSESSMENT ───────────────────────────────────────────

export const submitSelf = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const { appraisalId, ratings, selfNotes } = req.body;

        if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
            return res.status(400).json({ message: 'Ratings are required' });
        }

        const result = await appraisalService.submitSelfRating(organizationId, userReq.id, appraisalId, ratings, selfNotes);

        await logAction(userReq.id, 'APPRAISAL_SELF_SUBMIT', 'Appraisal', appraisalId, { ratingCount: ratings.length }, req.ip);

        // Notify the line manager + SMS
        const employee = await prisma.user.findUnique({
            where: { id: userReq.id },
            include: { supervisor: { select: { id: true, contactNumber: true } } },
        });

        if (employee?.supervisor?.id) {
            notifyAppraisalSubmitted({
                organizationId,
                managerId: employee.supervisor.id,
                employeeName: employee.fullName,
                appraisalId,
            }).catch(() => {});
        }

        if (employee?.supervisor?.contactNumber) {
            sendSMS({
                to: employee.supervisor.contactNumber,
                message: `Nexus HRM: ${employee.fullName} has submitted their self-appraisal and is awaiting your review.`,
            }).catch(() => {});
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ─── MANAGER: REVIEW TEAM MEMBER ─────────────────────────────────────────────

export const submitManager = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const { appraisalId, ratings, managerNotes } = req.body;

        if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
            return res.status(400).json({ message: 'Ratings are required' });
        }

        const result = await appraisalService.submitManagerReview(organizationId, user.id, appraisalId, ratings, managerNotes);

        await logAction(user.id, 'APPRAISAL_MANAGER_REVIEW', 'Appraisal', appraisalId, { ratingCount: ratings.length, score: result.finalScore }, req.ip);

        // Notify MD for final verdict
        const md = await prisma.user.findFirst({
            where: { organizationId, role: 'MD' },
            select: { id: true },
        });
        const appr = await prisma.appraisal.findUnique({
            where: { id: appraisalId },
            include: { employee: { select: { fullName: true } }, cycle: true }
        });
        if (md?.id && appr) {
            notifyFinalVerdictRequired({
                organizationId,
                mdUserId: md.id,
                employeeName: appr.employee.fullName,
                cycleId: appr.cycleId,
            }).catch(() => {});
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ─── MANAGER: GET TEAM APPRAISALS ─────────────────────────────────────────────

export const getTeamAppraisals = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const appraisals = await appraisalService.getTeamAppraisals(organizationId, user.id);
        res.json(appraisals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── MD/DIRECTOR: FINAL VERDICT LIST ─────────────────────────────────────────

export const getFinalVerdictList = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const appraisals = await appraisalService.getAwaitingVerdictAppraisals(organizationId);
        res.json(appraisals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── MD/DIRECTOR: SUBMIT FINAL VERDICT ───────────────────────────────────────

export const submitFinalVerdict = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const { appraisalId, mdNotes } = req.body;

        if (!appraisalId) return res.status(400).json({ message: 'appraisalId is required' });

        const result = await appraisalService.submitFinalVerdict(organizationId, user.id, appraisalId, mdNotes);

        await logAction(user.id, 'APPRAISAL_FINAL_VERDICT', 'Appraisal', appraisalId, { score: result.finalScore }, req.ip);

        // Notify the employee
        if (result.finalScore !== null) {
            const appraisal = await prisma.appraisal.findUnique({
                where: { id: appraisalId },
                include: { cycle: true },
            });
            if (appraisal) {
                notifyAppraisalCompleted({
                    organizationId,
                    employeeId: appraisal.employeeId,
                    cycleName: appraisal.cycle?.name || 'Performance Review',
                    finalScore: result.finalScore,
                }).catch(() => {});
            }
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ─── CYCLE STATS ──────────────────────────────────────────────────────────────

export const getCycleStats = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const { cycleId } = req.params;
        const stats = await appraisalService.getCycleStats(organizationId, cycleId);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
