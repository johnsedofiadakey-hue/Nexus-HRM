import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

const buffer: any[] = [];

// Flush buffer every 30 seconds
setInterval(async () => {
  if (buffer.length > 0) {
    try {
      const dataToFlush = buffer.splice(0);
      await prisma.apiUsage.createMany({ data: dataToFlush });
    } catch (error) {
      // Silent failure for telemetry - critical for stability
    }
  }
}, 30000);

export const apiUsageMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    try {
      const duration = Date.now() - start;
      const user = (req as any).user;
      
      buffer.push({
        organizationId: user?.organizationId || 'PUBLIC',
        method: req.method,
        path: req.baseUrl + req.path,
        statusCode: res.statusCode,
        duration: duration,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (error) {
      // Silent failure for telemetry
    }
  });

  next();
};
