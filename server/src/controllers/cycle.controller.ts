import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const createCycle = async (req: Request, res: Response) => {
    try {
        const { title, startDate, endDate, organizationId } = req.body;
        const cycle = await prisma.reviewCycle.create({
            data: {
                title,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                organizationId: organizationId || 'DEFAULT',
            },
        });
        res.status(201).json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCycles = async (req: Request, res: Response) => {
    try {
        const cycles = await prisma.reviewCycle.findMany({
            orderBy: { startDate: 'desc' },
        });
        res.json(cycles);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCycleStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const cycle = await prisma.reviewCycle.update({
            where: { id },
            data: { status },
        });
        res.json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
