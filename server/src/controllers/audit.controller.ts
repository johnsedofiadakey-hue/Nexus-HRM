import { Request, Response } from 'express';
import { getAuditLogs } from '../services/audit.service';

export const getLogs = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const data = await getAuditLogs(page, limit);
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
