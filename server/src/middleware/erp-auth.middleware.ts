import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';
import { tenantContext } from '../utils/context';

/**
 * ERP Integration Authentication Middleware
 * Validates the X-Nexus-ERP-Key header against the database.
 * Supports IP Whitelisting for enhanced enterprise security.
 */
export const authenticateErp = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-nexus-erp-key'] as string;
  const clientIp = req.ip || req.get('x-forwarded-for') || req.socket.remoteAddress;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-Nexus-ERP-Key header' });
  }

  try {
    // 1. Find the integration (assuming keys are stored as simple strings for now, or hashed if preferred)
    const integration = await prisma.erpIntegration.findUnique({
      where: { apiKey }
    });

    if (!integration || !integration.isActive) {
      console.warn(`[ERP Auth] Invalid or inactive API key attempt: ${apiKey.substring(0, 8)}... from IP ${clientIp}`);
      return res.status(401).json({ error: 'Invalid or inactive ERP API Key' });
    }

    // 2. IP Whitelisting Validation
    if (integration.ipWhitelist) {
      const allowedIps = integration.ipWhitelist.split(',').map(ip => ip.trim());
      const isAllowed = allowedIps.some(allowedIp => {
        // Simple equality check for now - can be expanded to CIDR if needed
        return clientIp && (allowedIp === clientIp || clientIp.includes(allowedIp));
      });

      if (!isAllowed) {
        console.error(`[ERP Auth] IP Address blocked: ${clientIp} is not in whitelist for ${integration.systemName}`);
        return res.status(403).json({ error: 'Access denied: Client IP not whitelisted' });
      }
    }

    // 3. Update last access timestamp (async, don't block request)
    prisma.erpIntegration.update({
      where: { id: integration.id },
      data: { lastAccessedAt: new Date() }
    }).catch(err => console.error('[ERP Auth] Failed to update lastAccessedAt:', err.message));

    // 4. Attach context
    (req as any).erp = {
      id: integration.id,
      systemName: integration.systemName,
      organizationId: integration.organizationId
    };

    // 5. Initialize Tenant Context for automatic filtering
    tenantContext.run({
      organizationId: integration.organizationId,
      userId: `erp-${integration.id}`,
      role: 'ERP_GATEWAY'
    }, () => {
      next();
    });

  } catch (error: any) {
    console.error('[ERP Auth] Critical Security Error:', error.message);
    return res.status(500).json({ error: 'Internal ERP Authentication Error' });
  }
};
