import { Request, Response } from 'express';
import * as appraisalService from '../services/appraisal.service';

export const initiateCycle = async (req: Request, res: Response) => {
    try {
        const { cycleId, employeeIds } = req.body;
        const results = await appraisalService.initAppraisalCycle(cycleId, employeeIds);
        res.status(201).json({ message: `Initiated ${results.length} appraisals`, data: results });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyLatest = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const appraisal = await appraisalService.getMyAppraisal(userId, req.query.cycleId as string);
        if (!appraisal) return res.status(404).json({ message: "No active appraisal found" });
        res.json(appraisal);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const submitSelf = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { appraisalId, ratings } = req.body;
        const result = await appraisalService.submitSelfRating(userId, appraisalId, ratings);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const submitManager = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const reviewerId = req.user.id;
        const { appraisalId, ratings } = req.body;
        const result = await appraisalService.submitManagerReview(reviewerId, appraisalId, ratings);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getTeamAppraisals = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const managerId = req.user.id;
        const appraisals = await appraisalService.getTeamAppraisals(managerId);
        res.json(appraisals);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

