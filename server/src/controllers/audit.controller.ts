import { Request, Response } from 'express';
import * as auditService from '../services/audit.service';

export const getLogs = async (req: Request, res: Response) => {
    try {
        const logs = await auditService.getAuditLogs();
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
