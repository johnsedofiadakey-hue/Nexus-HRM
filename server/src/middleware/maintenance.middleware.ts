import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

// FIX: In-memory cache to avoid hitting DB on every request
let cachedMaintenanceMode: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30_000; // Refresh cache every 30 seconds

export const invalidateMaintenanceCache = () => {
    cachedMaintenanceMode = null;
    cacheTimestamp = 0;
};

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/dev')) return next();
    if (req.path.startsWith('/api/auth')) return next(); // Never block login

    const devKey = req.headers['x-dev-master-key'];
    if (devKey && devKey === process.env.DEV_MASTER_KEY) return next();

    try {
        const now = Date.now();
        if (cachedMaintenanceMode === null || now - cacheTimestamp > CACHE_TTL_MS) {
            const settings = await prisma.systemSettings.findFirst();
            cachedMaintenanceMode = settings?.isMaintenanceMode ?? false;
            cacheTimestamp = now;
        }

        if (cachedMaintenanceMode) {
            return res.status(503).json({
                message: 'System Under Maintenance',
                info: 'The system is currently undergoing scheduled maintenance. Please try again shortly.'
            });
        }

        next();
    } catch (error) {
        console.error('Maintenance Check Failed:', error);
        next(); // Fail open
    }
};
