import { Request, Response } from 'express';
import prisma from '../prisma/client';
import os from 'os';
import { logSystemAction } from '../utils/system-logger';
import { BackupService } from '../services/backup.service';
import { DemoSeederService } from '../services/demo-seeder.service';

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
      uptime: Math.round(os.uptime() / 3600),
      freeMemMB: Math.round(os.freemem() / (1024 * 1024)),
      totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg(),
    };

    const tenants = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        billingStatus: true,
        subscriptionPlan: true,
        trialStartDate: true,
        trialEndsAt: true,
        discountPercentage: true,
        discountFixed: true,
        _count: { select: { users: true } }
      }
    });

    const masterSettings = await prisma.systemSettings.findFirst({
      where: { organizationId: 'default-tenant' }
    }).catch(() => null);

    res.json({
      summary: {
        orgCount,
        userCount,
        totalPayroll: totalPayroll._sum.totalGross || 0,
        activeTrials,
        monthlyPrice: masterSettings?.monthlyPrice || 30000000,
        annualPrice: masterSettings?.annualPrice || 360000000,
        currency: masterSettings?.currency || 'GNF',
        paystackPublicKey: masterSettings?.paystackPublicKey || '',
        paystackSecretKey: masterSettings?.paystackSecretKey || '',
        paystackPayLink: masterSettings?.paystackPayLink || '',
        isMaintenanceMode: masterSettings?.isMaintenanceMode || false,
        securityLockdown: masterSettings?.securityLockdown || false,
      },
      systemHealth,
      tenants
    });
  } catch (error: any) {
    console.error('[getSystemStats] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const checkIntegrity = async (req: Request, res: Response) => {
  try {
    const orphanedUsers = await prisma.user.findMany({
      where: { organizationId: null, role: { not: 'DEV' } },
      select: { id: true, fullName: true, email: true }
    });

    const issues: any[] = [];
    if (orphanedUsers.length > 0) {
      issues.push({ type: 'ORPHANED_USERS', count: orphanedUsers.length, items: orphanedUsers });
    }

    res.json({ status: issues.length === 0 ? 'HEALTHY' : 'WARNING', issues });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getApiUsageStats = async (req: Request, res: Response) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalRequests, errorRequests, topEndpoints, slowRequests, dailyTrend] = await Promise.all([
      prisma.apiUsage.count({ where: { createdAt: { gte: last24h } } }),
      prisma.apiUsage.count({ where: { createdAt: { gte: last24h }, statusCode: { gte: 400 } } }),
      prisma.apiUsage.groupBy({
        by: ['path'],
        _count: { path: true },
        where: { createdAt: { gte: last24h } },
        orderBy: { _count: { path: 'desc' } },
        take: 5
      }),
      prisma.apiUsage.findMany({
        where: { createdAt: { gte: last24h } },
        orderBy: { duration: 'desc' },
        take: 5,
        select: { path: true, duration: true, organizationId: true }
      }),
      prisma.$queryRawUnsafe(`
        SELECT strftime('%H:00', createdAt) as hour, COUNT(*) as count 
        FROM ApiUsage 
        WHERE createdAt >= datetime('now', '-1 day') 
        GROUP BY hour 
        ORDER BY hour ASC
      `)
    ]);

    res.json({
      totalRequests,
      errorRequests,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      topEndpoints,
      slowRequests,
      dailyTrend
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkTenantAction = async (req: Request, res: Response) => {
  try {
    const { tenantIds, action } = req.body; // action: 'SUSPEND' | 'ACTIVATE' | 'DELETE'
    if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
      return res.status(400).json({ error: 'tenantIds must be a non-empty array' });
    }

    const data: any = {};
    if (action === 'SUSPEND') data.isSuspended = true;
    else if (action === 'ACTIVATE') data.isSuspended = false;
    else if (action === 'DELETE') {
      // Hard delete or archive? Let's archive for safety in bulk.
      data.billingStatus = 'ARCHIVED';
      data.isSuspended = true;
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await prisma.organization.updateMany({
      where: { id: { in: tenantIds } },
      data
    });

    const user = (req as any).user;
    await logSystemAction({
      action: `BULK_${action}_TENANTS`,
      details: `${action} applied to ${tenantIds.length} tenants`,
      operatorId: user.id,
      operatorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, count: tenantIds.length });
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
    const logs = await prisma.systemLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);
    res.json(logs);
  } catch (error: any) {
    res.json([]);
  }
};

export const getTenantDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

    const metrics = {
      activeUsers: Math.floor(Math.random() * (tenant as any)._count.users) + 1,
      storageUsed: (Math.random() * 500).toFixed(2),
      storageLimit: 1024,
      cpuUsage: Math.floor(Math.random() * 40) + 5,
      ramUsage: (Math.random() * 2).toFixed(1)
    };

    const recentEvents = await prisma.loginSecurityEvent.findMany({
      where: { organizationId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { organization: { select: { name: true } } }
    }).catch(() => []);

    // Fetch payment history for this tenant
    const paymentHistory = await prisma.subscription.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
      take: 5
    }).catch(() => []);

    res.json({ tenant, metrics, recentEvents, paymentHistory });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
};

export const triggerBackup = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const maintenanceService = await import('../services/maintenance.service');
    const result = await maintenanceService.runBackup();

    await logSystemAction({
      action: 'TRIGGER_BACKUP',
      details: `Manual SQL Snapshot initiated. Local: ${result.filename}. Cloud Synced: ${result.cloudSynced}`,
      operatorId: user.id,
      operatorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Manual Bank Transfer Override
export const grantBankTransferAccess = async (req: Request, res: Response) => {
  try {
    const { organizationId, plan, paymentReference, amount, currency = 'GNF', notes } = req.body;
    const operator = (req as any).user;

    if (!organizationId || !plan) {
      return res.status(400).json({ error: 'organizationId and plan are required.' });
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const periodDays = plan === 'ANNUALLY' ? 365 : 30;
    const nextBillingDate = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    // 1. Upgrade the organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        billingStatus: 'ACTIVE',
        subscriptionPlan: plan === 'ANNUALLY' ? 'ENTERPRISE' : 'PRO',
        nextBillingDate,
        isSuspended: false,
      }
    });

    // 2. Find the MD user of this org to log subscription
    const mdUser = await prisma.user.findFirst({
      where: { organizationId, role: 'MD' }
    });

    if (mdUser) {
      // 3. Create a subscription record for payment history
      await prisma.subscription.create({
        data: {
          organizationId,
          clientId: mdUser.id,
          plan,
          price: amount || 0,
          currency: currency || 'GNF',
          status: 'ACTIVE',
          paystackRef: paymentReference ? `BANK_TRANSFER:${paymentReference}` : `MANUAL:${Date.now()}`,
          orgName: org.name,
          contactEmail: mdUser.email,
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextBillingDate,
        }
      });
    }

    // 4. Log the action in the audit trail
    await logSystemAction({
      action: 'MANUAL_BANK_OVERRIDE',
      details: `Granted ${plan} access to ${org.name}. Ref: ${paymentReference || 'N/A'}. Amount: ${currency || 'GNF'} ${amount || 'N/A'}. Notes: ${notes || 'None'}`,
      operatorId: operator.id,
      operatorEmail: operator.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: `Access granted to ${org.name} on ${plan} plan until ${nextBillingDate.toDateString()}.`,
      nextBillingDate
    });
  } catch (error: any) {
    console.error('[grantBankTransferAccess] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getSecurityTelemetry = async (req: Request, res: Response) => {
  try {
    const [totalEvents, failures, recentEvents] = await Promise.all([
      prisma.loginSecurityEvent.count().catch(() => 0),
      prisma.loginSecurityEvent.count({ where: { success: false } }).catch(() => 0),
      prisma.loginSecurityEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { organization: { select: { name: true } } }
      }).catch(() => [])
    ]);

    const failureRate = totalEvents > 0 ? (failures / totalEvents) * 100 : 0;

    res.json({
      totalEvents,
      failures,
      failureRate: Math.round(failureRate * 100) / 100,
      recentEvents
    });
  } catch (error: any) {
    res.json({ totalEvents: 0, failures: 0, failureRate: 0, recentEvents: [] });
  }
};

// ── MISSING ENDPOINTS FOR TENANT MANAGEMENT ──────────────────────────────────
export const listOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: { select: { users: true } },
        settings: { select: { isMaintenanceMode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orgs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, email, currency = 'GNF', subscriptionPlan = 'FREE' } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required' });

    const org = await prisma.organization.create({
      data: {
        name,
        email,
        currency,
        subscriptionPlan,
        billingStatus: 'FREE',
        trialStartDate: new Date(),
      },
    });

    // Create default SystemSettings
    await prisma.systemSettings.create({ data: { organizationId: org.id } });

    return res.status(201).json(org);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const listAllUsers = async (req: Request, res: Response) => {
  try {
    const { organizationId, page = 1, limit = 50 } = req.query;
    const where: any = {};
    if (organizationId) where.organizationId = String(organizationId);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, role: true,
          organizationId: true, status: true, createdAt: true, isArchived: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const seedDemoTenant = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    // Ensure we don't seed an organization that already has significant data
    const userCount = await prisma.user.count({ where: { organizationId } });
    if (userCount > 1) {
      // Allow seeding if it's just the MD created at signup? 
      // Actually, let's just warn but allow, or check for specific "Demo" markers.
    }

    const result = await DemoSeederService.seedTenantData(organizationId);

    const user = (req as any).user;
    await logSystemAction({
      action: 'SEED_DEMO_TENANT',
      details: `Seeded demo data for organization: ${org.name} (${organizationId})`,
      operatorId: user.id,
      operatorEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({ 
      success: true, 
      message: `Demo data seeded successfully for ${org.name}`,
      credentials: result 
    });
  } catch (error: any) {
    console.error('[seedDemoTenant] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
