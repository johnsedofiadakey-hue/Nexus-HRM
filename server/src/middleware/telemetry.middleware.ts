import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const apiUsageMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    // Run telemetry in background to avoid blocking main thread performance
    setImmediate(async () => {
      try {
        const duration = Date.now() - start;
        const user = (req as any).user;
        
        await (prisma as any).apiUsage.create({
          data: {
            organizationId: user?.organizationId || 'PUBLIC',
            method: req.method,
            path: req.baseUrl + req.path,
            statusCode: res.statusCode,
            duration: duration,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        });
      } catch (error) {
        // Silent failure for telemetry - critical for stability
        // console.error('[Telemetry Error]:', error);
      }
    });
  });

  next();
};
