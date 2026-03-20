import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const apiUsageMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      const user = (req as any).user;
      
      // We use the raw prismaClient since the extension might not be fully loaded 
      // of might cause recursion if it tracks its own usage (though we skip telemetry for telemetry).
      // Actually, we can use the default prisma export.
      
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
      // Fail silently to not disrupt the main request flow
      console.error('[Telemetry Error]:', error);
    }
  });

  next();
};
