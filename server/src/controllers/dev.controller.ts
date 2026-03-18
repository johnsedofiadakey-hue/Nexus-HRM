import { Request, Response } from 'express';
import prisma from '../prisma/client';
import os from 'os';
import { logSystemAction } from '../utils/system-logger';

export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const [orgCount, userCount, totalPayroll, activeTrials] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count({ where: { role: { not: 'DEV' } } }),
      prisma.payrollRun.aggregate({ _sum: { totalGross: true } }),
      prisma.organization.count({ where: { billingStatus: 'FREE' } }),
    ]);

    const systemHealth = {
      platform: os.platform(),
      uptime: Math.round(os.uptime() / 3600), // hours
      freeMemMB: Math.round(os.freemem() / (1024 * 1024)),
      totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg(),
    };

    const tenants = await prisma.organization.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        billingStatus: true,
        subscriptionPlan: true,
        trialStartDate: true,
        _count: { select: { users: true } }
      }
    });

    const masterSettings = await prisma.systemSettings.findFirst({
      where: { organizationId: 'default-tenant' } // Global master config
    });

    res.json({
      summary: {
        orgCount,
        userCount,
        totalPayroll: totalPayroll._sum.totalGross || 0,
        activeTrials,
        monthlyPrice: masterSettings?.monthlyPriceGHS || 100,
        annualPrice: masterSettings?.annualPriceGHS || 1000,
        trialDays: masterSettings?.trialDays || 14
      },
      systemHealth,
      tenants
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkIntegrity = async (req: Request, res: Response) => {
  try {
    const orphanedUsers = await prisma.user.findMany({
      where: { 
        organizationId: null,
        role: { not: 'DEV' }
      },
      select: { id: true, fullName: true, email: true }
    });

    const issues: any[] = [];
    if (orphanedUsers.length > 0) {
      issues.push({
        type: 'ORPHANED_USERS',
        count: orphanedUsers.length,
        items: orphanedUsers
      });
    }

    res.json({
      status: issues.length === 0 ? 'HEALTHY' : 'WARNING',
      issues
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSecurityTelemetry = async (req: Request, res: Response) => {
  try {
    const [totalEvents, failures, recentEvents] = await Promise.all([
      (prisma as any).loginSecurityEvent.count(),
      (prisma as any).loginSecurityEvent.count({ where: { success: false } }),
      (prisma as any).loginSecurityEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { name: true } } }
      })
    ]);

    const failureRate = totalEvents > 0 ? (failures / totalEvents) * 100 : 0;

    res.json({
      totalEvents,
      failures,
      failureRate: Math.round(failureRate * 100) / 100,
      recentEvents
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleTenantFeature = async (req: Request, res: Response) => {
  try {
    const { organizationId, feature, enabled } = req.body;
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const features = JSON.parse((org as any).features || '{}');
    features[feature] = enabled;

    await prisma.organization.update({
      where: { id: organizationId },
      data: { features: JSON.stringify(features) } as any
    });

    const user = (req as any).user;
    await logSystemAction({
      action: `TOGGLE_FEATURE_${feature.toUpperCase()}`,
      details: `Set ${feature} to ${enabled} for ${org.name}`,
      operatorId: user.id,
      operatorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, features });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const extendTrial = async (req: Request, res: Response) => {
  try {
    const { organizationId, days } = req.body;
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const currentExpiry = org.trialEndsAt || new Date();
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.organization.update({
      where: { id: organizationId },
      data: { trialEndsAt: newExpiry, billingStatus: 'FREE' }
    });

    const user = (req as any).user;
    await logSystemAction({
      action: 'EXTEND_TRIAL',
      details: `Extended trial by ${days} days for ${org.name}`,
      operatorId: user.id,
      operatorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, newExpiry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    const logs = await (prisma as any).systemLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerBackup = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // SQLite Specific hot backup
    await prisma.$executeRawUnsafe(`VACUUM INTO 'prisma/backup-${Date.now()}.db'`);

    await logSystemAction({
      action: 'TRIGGER_BACKUP',
      details: 'Manual database backup initiated',
      operatorId: user.id,
      operatorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Backup created successfully in prisma/ folder' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
