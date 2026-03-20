import { Request, Response } from 'express';
import { AppraisalService } from '../services/appraisal.service';
import { getOrgId } from './enterprise.controller';
import { logAction } from '../services/audit.service';

export const initAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const cycle = await AppraisalService.initCycle(organizationId, req.body);
    
    await logAction((req as any).user.id, 'APPRAISAL_CYCLE_INIT', 'AppraisalCycle', cycle.id, {}, req.ip);
    return res.status(201).json(cycle);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const submitAppraisalReview = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    
    const review = await AppraisalService.submitReview(packetId, userId, organizationId, req.body);
    
    await logAction(userId, 'APPRAISAL_REVIEW_SUBMITTED', 'AppraisalReview', review.id, { packetId }, req.ip);
    return res.json(review);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getPacketDetail = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    
    const packet = await AppraisalService.getPacketDetail(packetId, organizationId);
    if (!packet) return res.status(404).json({ error: 'Appraisal packet not found' });
    
    return res.json(packet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyPackets = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const packets = await AppraisalService.getEmployeePackets(userId, organizationId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTeamPackets = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const packets = await AppraisalService.getReviewerPackets(userId, organizationId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
