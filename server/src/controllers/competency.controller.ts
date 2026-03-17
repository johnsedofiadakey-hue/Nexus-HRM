import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';
import { logAction } from '../services/audit.service';

export const getCompetencies = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const competencies = await prisma.competency.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' }
    });
    res.json(competencies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createCompetency = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const { name, description, weight } = req.body;
    const user = (req as any).user;

    const competency = await prisma.competency.create({
      data: {
        organizationId: orgId,
        name,
        description,
        weight: parseFloat(weight) || 1.0
      }
    });

    await logAction(user.id, 'COMPETENCY_CREATE', 'Competency', competency.id, { name }, req.ip);
    res.status(201).json(competency);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCompetency = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const { id } = req.params;
    const { name, description, weight } = req.body;
    const user = (req as any).user;

    const competency = await prisma.competency.update({
      where: { id, organizationId: orgId },
      data: {
        name,
        description,
        weight: parseFloat(weight) || 1.0
      }
    });

    await logAction(user.id, 'COMPETENCY_UPDATE', 'Competency', competency.id, { name }, req.ip);
    res.json(competency);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteCompetency = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'default-tenant';
    const { id } = req.params;
    const user = (req as any).user;

    // Check if it's used in any ratings
    const usage = await prisma.appraisalRating.count({
      where: { competencyId: id }
    });

    if (usage > 0) {
      return res.status(400).json({ error: "Cannot delete competency as it is currently in use by existing appraisals." });
    }

    await prisma.competency.delete({
      where: { id, organizationId: orgId }
    });

    await logAction(user.id, 'COMPETENCY_DELETE', 'Competency', id, {}, req.ip);
    res.json({ message: "Competency deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
