import { Request, Response } from 'express';
import { getAuditLogs } from '../services/audit.service';

export const getLogs = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organizationId = user?.organizationId || 'default-tenant';
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const entity = req.query.entity as string | undefined;
        const userId = req.query.userId as string | undefined;

        const data = await getAuditLogs(organizationId, page, limit, { entity, userId });
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
