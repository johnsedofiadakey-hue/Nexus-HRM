import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const subscriptionGuard = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userRole = req.user?.role;

    // Developers completely bypass billing lockdowns
    if (userRole === 'DEV') {
        return next();
    }

    try {
        const settings = await prisma.systemSettings.findFirst();

        if (!settings) return next();

        // Global Maintenance Switch
        if (settings.isMaintenanceMode) {
            return res.status(503).json({ error: 'System is currently undergoing maintenance. Please try again later.' });
        }

        // SaaS Expiration Lockout (402 Payment Required)
        if (settings.subscriptionStatus === 'EXPIRED' || settings.subscriptionStatus === 'SUSPENDED') {
            return res.status(402).json({
                error: 'System Subscription Expired',
                message: 'Your SaaS subscription has lapsed. Please ask the Managing Director to renew access.'
            });
        }

        next();
    } catch (error) {
        console.error('Failed to verify subscription status:', error);
        // Prefer failing open to avoid locking the client entirely out due to transient DB issues.
        next();
    }
};
