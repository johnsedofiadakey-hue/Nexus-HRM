import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Skip if it's a Dev Route (Checking path or header)
    if (req.path.startsWith('/api/dev')) {
        return next();
    }

    const devKey = req.headers['x-dev-master-key'];
    // If request has valid Master Key, bypass maintenance (optional redundancy)
    if (devKey && devKey === process.env.DEV_MASTER_KEY) {
        return next();
    }

    // 2. Check System Settings
    try {
        // Optimization: In high traffic, this DB call on every request is heavy.
        // Ideally, cache this value in memory/Redis and update via webhook/signal.
        // For now, we will query simple findFirst.
        const settings = await prisma.systemSettings.findFirst();

        if (settings && settings.isMaintenanceMode) {
            return res.status(503).json({
                message: "System Under Maintenance",
                info: "The application is currently locked by the developer for critical updates. Please try again later."
            });
        }

        next();
    } catch (error) {
        // If DB fails, we might want to fail open or closed. 
        // Failing open (next()) enables app to work if DB recovers.
        console.error("Maintenance Check Failed:", error);
        next();
    }
};
