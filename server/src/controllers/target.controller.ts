import { Request, Response } from 'express';
import { TargetService } from '../services/target.service';
import { getOrgId } from './enterprise.controller';

export const createTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const originatorId = (req as any).user.id;
    const target = await TargetService.createTarget(req.body, originatorId, orgId);
    return res.status(201).json(target);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const cascadeTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const managerId = (req as any).user.id;
    const { parentTargetId, assignments } = req.body;
    const targets = await TargetService.cascadeTarget(parentTargetId, assignments, managerId, orgId);
    return res.status(201).json(targets);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const acknowledge = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const { targetId, status, message } = req.body;
    const target = await TargetService.acknowledge(targetId, userId, orgId, status, message);
    return res.json(target);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const updateProgress = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const { targetId, metricUpdates, submit } = req.body;
    const target = await TargetService.updateProgress(targetId, metricUpdates, userId, orgId, submit);
    return res.json(target);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const reviewTarget = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const reviewerId = (req as any).user.id;
    const { targetId, approved, feedback } = req.body;
    const target = await TargetService.reviewTarget(targetId, reviewerId, orgId, approved, feedback);
    return res.json(target);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
