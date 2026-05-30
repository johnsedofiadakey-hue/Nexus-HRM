import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

// ─── TTL Cache ────────────────────────────────────────────────────────────────
// Avoids 2 DB queries on every authenticated request.
// TTL: 60 seconds per org. Invalidated when settings or billing change.

const TTL_MS = 60_000;

interface CacheEntry {
  isMaintenanceMode: boolean;
  isSuspended: boolean;
  billingStatus: string | null;
  trialStartDate: Date;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();

export const invalidateSubscriptionCache = (organizationId: string) => {
  cache.delete(organizationId);
};

const getOrgStatus = async (organizationId: string): Promise<CacheEntry | null> => {
  const cached = cache.get(organizationId);
  if (cached && Date.now() - cached.cachedAt < TTL_MS) return cached;

  const [settings, org] = await Promise.all([
    prisma.systemSettings.findFirst({ where: { organizationId } }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { billingStatus: true, isSuspended: true, trialStartDate: true },
    }),
  ]);

  if (!org) return null;

  const entry: CacheEntry = {
    isMaintenanceMode: settings?.isMaintenanceMode ?? false,
    isSuspended: org.isSuspended,
    billingStatus: org.billingStatus,
    trialStartDate: new Date(org.trialStartDate),
    cachedAt: Date.now(),
  };

  cache.set(organizationId, entry);
  return entry;
};

// ─── Middleware ───────────────────────────────────────────────────────────────
export const subscriptionGuard = async (req: Request, res: Response, next: NextFunction) => {
  // Bypass for auth, settings, and dev routes to prevent lockouts
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/dev') || req.path.startsWith('/api/settings')) {
    return next();
  }

  const userRole = (req as any).user?.role;
  const organizationId = (req as any).user?.organizationId;

  // No authenticated user yet — let each route's authenticate middleware handle rejection.
  if (!userRole || !organizationId) return next();

  // Developers bypass billing lockdowns entirely.
  if (userRole === 'DEV') return next();

  try {
    const status = await getOrgStatus(organizationId);

    if (!status) return next();

    if (status.isMaintenanceMode) {
      return res.status(503).json({ error: 'System is currently undergoing maintenance. Please try again later.' });
    }

    if (status.isSuspended || status.billingStatus === 'SUSPENDED') {
      return res.status(402).json({
        error: 'System Subscription Expired',
        message: 'Your SaaS subscription has lapsed. Please renew access.',
      });
    }

    if (status.billingStatus === 'FREE' || !status.billingStatus) {
      const expiryDate = new Date(status.trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (new Date() > expiryDate) {
        return res.status(402).json({
          error: 'Trial period has expired.',
          message: 'Your 14-day trial has ended. Please upgrade to a paid plan to continue using the platform.',
        });
      }
    }

    next();
  } catch (error) {
    console.error('[SubscriptionGuard] Failed to verify status:', error);
    next(); // Fail open to avoid lockouts on transient DB errors
  }
};
