import { Request, Response } from 'express';
import prisma from '../prisma/client';
import os from 'os';

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
