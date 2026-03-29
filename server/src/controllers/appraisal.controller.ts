import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AppraisalService } from '../services/appraisal.service';
import { getOrgId } from './enterprise.controller';
import { getRoleRank } from '../middleware/auth.middleware';
// Local helper

import { logAction } from '../services/audit.service';

export const initAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const result = await AppraisalService.initCycle(organizationId, req.body);
    
    await logAction((req as any).user.id, 'APPRAISAL_CYCLE_INIT', 'AppraisalCycle', result.cycle.id, {}, req.ip);
    return res.status(201).json(result);
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
    const userId = (req as any).user.id;
    
    const packet = await AppraisalService.getPacketDetail(packetId, userId, organizationId);
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

export const getFinalVerdictList = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const packets = await AppraisalService.getFinalVerdictList(organizationId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const finalSignOff = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.body;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    
    const packet = await AppraisalService.finalizePacket(packetId, userId, organizationId);
    
    await logAction(userId, 'APPRAISAL_FINALIZED', 'AppraisalPacket', packet.id, {}, req.ip);
    return res.json(packet);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

// Cancel/void an appraisal packet (Director+ only)
export const cancelAppraisalPacket = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });
    if (!packet) return res.status(404).json({ error: 'Packet not found' });
    
    await (prisma as any).appraisalPacket.update({
      where: { id: packetId },
      data: { status: 'CANCELLED', currentStage: 'CANCELLED' }
    });
    
    await logAction((req as any).user.id, 'APPRAISAL_CANCELLED', 'AppraisalPacket', packetId, {}, req.ip);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const cycle = await AppraisalService.updateCycle(organizationId, id, req.body);
    return res.json(cycle);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    await AppraisalService.deleteCycle(organizationId, id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
export const updateAppraisalPacket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userRole = (req as any).user.role;
    
    // Only Director+ can modify active packets
    if (getRoleRank(userRole) < 80) {
      return res.status(403).json({ error: 'Not authorised to modify appraisal packets' });
    }
    
    const packet = await AppraisalService.updatePacket(organizationId, id, req.body);
    return res.json(packet);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteAppraisalPacket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userRole = (req as any).user.role;

    if (getRoleRank(userRole) < 80) {
      return res.status(403).json({ error: 'Not authorised to delete appraisal packets' });
    }

    await AppraisalService.deletePacket(organizationId, id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const raiseAppraisalDispute = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const { reason } = req.body;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;

    const packet = await AppraisalService.raiseDispute(packetId, userId, organizationId, reason);
    await logAction(userId, 'APPRAISAL_DISPUTE_RAISED', 'AppraisalPacket', packetId, { reason }, req.ip);
    
    return res.json(packet);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const resolveAppraisalDispute = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const { resolution } = req.body;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;

    // Only HR/MD (Rank 80+) can resolve
    if (getRoleRank((req as any).user.role) < 80) {
      return res.status(403).json({ error: 'Not authorised to resolve appraisal disputes' });
    }

    const packet = await AppraisalService.resolveDispute(packetId, userId, organizationId, resolution);
    await logAction(userId, 'APPRAISAL_DISPUTE_RESOLVED', 'AppraisalPacket', packetId, { resolution }, req.ip);
    
    return res.json(packet);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getCyclePackets = async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const packets = await AppraisalService.getCyclePackets(organizationId, cycleId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
