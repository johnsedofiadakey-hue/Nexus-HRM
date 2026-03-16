import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const createCycle = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const { name, type, startDate, endDate } = req.body;
        
        const cycle = await prisma.cycle.create({
            data: {
                name,
                type: type || 'QUARTERLY',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                organizationId,
                status: 'DRAFT'
            },
        });
        res.status(201).json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCycles = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        
        const cycles = await prisma.cycle.findMany({
            where: { organizationId },
            orderBy: { startDate: 'desc' },
        });
        res.json(cycles);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCycleStatus = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const organizationId = orgId || 'default-tenant';
        const { id } = req.params;
        const { status } = req.body;
        
        const cycle = await prisma.cycle.update({
            where: { id, organizationId },
            data: { status },
        });
        res.json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
