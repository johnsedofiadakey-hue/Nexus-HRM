import { Request, Response } from 'express';
import * as appraisalService from '../services/appraisal.service';
import { logAction } from '../services/audit.service';
import prisma from '../prisma/client';
import { sendSMS } from '../services/sms.service';
import { getOrgId } from './enterprise.controller';

export const initiateCycle = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const user = (req as any).user;
        const { cycleId, employeeIds } = req.body;
        const results = await appraisalService.initAppraisalCycle(organizationId, cycleId, employeeIds);
        await logAction(user.id, 'APPRAISAL_CYCLE_INIT', 'Cycle', cycleId, { count: results.length }, req.ip);
        res.status(201).json({ message: `Initiated ${results.length} appraisals`, data: results });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyLatest = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const user = (req as any).user;
        const userId = user.id;
        const start = Date.now();
        const appraisal = await appraisalService.getMyAppraisal(organizationId, userId, req.query.cycleId as string);
        console.log(`[PERF] getMyAppraisal for ${userId} took ${Date.now() - start}ms`);
        
        if (!appraisal) return res.status(200).json(null);
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
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitSelf = async (req: Request, res: Response) => {
    try {
        const userReq = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const userId = userReq.id;
        const { appraisalId, ratings } = req.body;
        const result = await appraisalService.submitSelfRating(organizationId, userId, appraisalId, ratings);
        await logAction(userId, 'APPRAISAL_SELF_SUBMIT', 'Appraisal', appraisalId, { ratingCount: ratings.length }, req.ip);

        // Notify Manager via SMS/WhatsApp
        const user = await prisma.user.findFirst({
            where: { id: userId, organizationId },
            include: { supervisor: true }
        });
        if (user?.supervisor?.contactNumber) {
            sendSMS({
                to: user.supervisor.contactNumber,
                message: `Nexus HRM: ${user.fullName} has submitted their self-appraisal. Awaiting your review.`
            }).catch(err => console.error('SMS error:', err));
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const submitManager = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const reviewerId = user.id;
        const { appraisalId, ratings } = req.body;
        const result = await appraisalService.submitManagerReview(organizationId, reviewerId, appraisalId, ratings);
        await logAction(reviewerId, 'APPRAISAL_MANAGER_REVIEW', 'Appraisal', appraisalId, { ratingCount: ratings.length }, req.ip);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getTeamAppraisals = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const managerId = user.id;
        const role = user.role;
        const appraisals = await appraisalService.getTeamAppraisals(organizationId, managerId, role);
        res.json(appraisals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

