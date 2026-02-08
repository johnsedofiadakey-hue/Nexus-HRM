import { Request, Response } from 'express';
import * as cycleService from '../services/cycle.service';

export const create = async (req: Request, res: Response) => {
    try {
        const cycle = await cycleService.createCycle(req.body);
        res.status(201).json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getAll = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as any;
        const cycles = await cycleService.getCycles(status ? { status } : undefined);
        res.json(cycles);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getOne = async (req: Request, res: Response) => {
    try {
        const cycle = await cycleService.getCycleById(req.params.id);
        if (!cycle) return res.status(404).json({ message: 'Cycle not found' });
        res.json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const update = async (req: Request, res: Response) => {
    try {
        const cycle = await cycleService.updateCycle(req.params.id, req.body);
        res.json(cycle);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const remove = async (req: Request, res: Response) => {
    try {
        await cycleService.deleteCycle(req.params.id);
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
