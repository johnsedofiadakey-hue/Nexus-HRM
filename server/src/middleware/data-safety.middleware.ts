import { NextFunction, Request, Response } from 'express';

/**
 * Destructive operations are never available through the production API.
 *
 * In non-production environments they remain disabled by default and require
 * an explicit ALLOW_DESTRUCTIVE_OPERATIONS=true opt-in. Production recovery
 * must happen through an audited, backup-first runbook rather than an HTTP
 * endpoint.
 */
export const requireDestructiveOperationsEnabled = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const explicitlyEnabled = process.env.ALLOW_DESTRUCTIVE_OPERATIONS === 'true';

    if (isProduction || !explicitlyEnabled) {
      console.error('[DataSafety] Blocked destructive operation', {
        operation,
        actorId: req.user?.id,
        organizationId: req.user?.organizationId,
        path: req.originalUrl,
        environment: process.env.NODE_ENV || 'unknown',
      });

      return res.status(403).json({
        error: 'Destructive operation disabled by data-protection policy.',
        code: 'DESTRUCTIVE_OPERATION_DISABLED',
        operation,
      });
    }

    return next();
  };
};
