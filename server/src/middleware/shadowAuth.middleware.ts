import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from './auth.middleware';

/**
 * Shadow Authentication Middleware
 * Allows access if:
 * 1. A valid 'x-dev-master-key' is provided in the headers matching the environment config.
 * 2. A valid JWT token with 'DEV' role is provided (standard auth).
 */
export const shadowAuth = async (req: Request, res: Response, next: NextFunction) => {
    const masterKey = req.headers['x-dev-master-key'];
    const envKey = process.env.DEV_MASTER_KEY;

    // 1. Check Master Key (Shadow Access)
    if (envKey && masterKey === envKey) {
        // Populate dummy dev user to satisfy downstream role checks
        (req as any).user = {
            id: 'shadow-dev-master',
            role: 'DEV',
            name: 'Shadow Administrator',
            organizationId: null,
            rank: 100
        };
        console.log(`[ShadowAuth] Master Key verified for: ${req.method} ${req.path}`);
        return next();
    }

    // 2. Fallback to Standard Authentication
    // We wrap authenticate here to capture its behavior
    return authenticate(req, res, () => {
        // If standard auth succeeds, check if the user is a DEV
        const user = (req as any).user;
        if (user && user.role === 'DEV') {
            return next();
        }
        
        // If not a DEV, reject
        return res.status(403).json({ 
            error: 'Access denied: Developer privileges required',
            hint: 'Use the Master Key for Shadow Access if you are an administrator.'
        });
    });
};
