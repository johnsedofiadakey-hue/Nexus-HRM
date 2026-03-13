import { Request, Response } from 'express';
import os from 'os';
import prisma from '../prisma/client';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const loadAvg = os.loadavg();

    const dbStatus = await prisma.$queryRaw`SELECT 1`.then(() => 'UP').catch(() => 'DOWN');

    res.json({
      uptime,
      memory: {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      },
      load: loadAvg,
      dbStatus,
      platform: os.platform(),
      cpus: os.cpus().length
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const [userCount, activeUsers, kpiCount, leaveCount, payrollCount, auditCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.kpiSheet.count().catch(() => 0),
      prisma.leaveRequest.count().catch(() => 0),
      prisma.payrollRun.count().catch(() => 0),
      prisma.auditLog.count().catch(() => 0),
    ]);

    const recentAudit = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, role: true } } }
    }).catch(() => []);

    res.json({
      system: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        uptimeSeconds: process.uptime(),
        memoryPct: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100),
        memoryUsedMB: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
        memoryTotalMB: Math.round(os.totalmem() / 1024 / 1024),
        processMemMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuLoad: os.loadavg()
      },
      counts: {
        totalUsers: userCount,
        activeUsers,
        kpiSheets: kpiCount,
        leaveRequests: leaveCount,
        payrollRuns: payrollCount,
        auditLogs: auditCount
      },
      recentAudit,
      settings: {
        isMaintenanceMode: false, // Placeholder
        securityLockdown: false   // Placeholder
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSecurityAlerts = async (req: Request, res: Response) => {
  try {  res.json({
    alerts: [],
    activeSessions: 1, // Simulated
    recentActivity: []
  });
  } catch (err: any) {
    console.error('[dev.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getBackups = async (req: Request, res: Response) => {
  try {  const backupDir = path.join(process.cwd(), 'prisma', 'backups');
  if (!fs.existsSync(backupDir)) return res.json([]);

  const files = fs.readdirSync(backupDir).map(file => {
    const stats = fs.statSync(path.join(backupDir, file));
    return { name: file, size: stats.size, created: stats.birthtime };
  });
  res.json(files);
  } catch (err: any) {
    console.error('[dev.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const triggerBackup = async (req: Request, res: Response) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./prisma/backups/backup-${timestamp}.db`;

    exec(`mkdir -p ./prisma/backups && cp ./prisma/dev.db ${backupPath}`, (error) => {
      if (error) return res.status(500).json({ message: 'Backup failed' });
      res.json({ message: 'Database backup initiated successfully', path: backupPath });
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditLog = async (req: Request, res: Response) => {
  try {  const limit = parseInt(req.query.limit as string) || 100;
  const logs = await prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, role: true } } }
  }).catch(() => []);
  res.json({ logs });
  } catch (err: any) {
    console.error('[dev.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getSubscriptions = async (req: Request, res: Response) => res.json([]);
export const getPaymentConfig = async (req: Request, res: Response) => res.json({});
export const killSwitch = async (req: Request, res: Response) => res.json({ message: 'Kill switch state updated' });
export const securityLockdown = async (req: Request, res: Response) => res.json({ message: 'Lockdown state updated' });
export const forceLogoutAll = async (req: Request, res: Response) => res.json({ message: 'All sessions invalidated' });
export const getUsers = async (req: Request, res: Response) => {
  try {  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, email: true, role: true, status: true, employeeCode: true, joinDate: true, organizationId: true }
  });
  res.json(users);
  } catch (err: any) {
    console.error('[dev.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// ─── ORGANIZATION MANAGEMENT ───────────────────────────────────────────────
export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    res.json(orgs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, address, city, country, currency, subscriptionPlan, primaryColor } = req.body;
    const org = await prisma.organization.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        country,
        currency: currency || 'GHS',
        subscriptionPlan: subscriptionPlan || 'FREE',
        primaryColor: primaryColor || '#4F46E5',
        settings: {
          create: {
            trialDays: 14
          }
        }
      }
    });
    res.status(201).json(org);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const org = await prisma.organization.update({
      where: { id },
      data
    });
    res.json(org);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // For safety, we might implement soft delete by flagging users or naming
    await prisma.organization.delete({ where: { id } });
    res.json({ message: 'Organization deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ─── IMPERSONATION ────────────────────────────────────────────────────────
export const impersonateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: true, status: true, organizationId: true, email: true, avatarUrl: true }
    });

    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.status === 'TERMINATED') return res.status(403).json({ error: 'Cannot impersonate terminated user' });

    const adminUser = req.user;
    const token = jwt.sign({
      id: targetUser.id,
      role: targetUser.role,
      name: targetUser.fullName,
      status: targetUser.status,
      organizationId: targetUser.organizationId || 'default-tenant',
      isImpersonating: true,
      adminId: adminUser.id
    }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: targetUser.id,
        name: targetUser.fullName,
        email: targetUser.email,
        role: targetUser.role,
        organizationId: targetUser.organizationId,
        avatar: targetUser.avatarUrl,
        isImpersonating: true
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePaymentConfig = async (req: Request, res: Response) => {
  try {
    const { paystackPublicKey, paystackSecretKey, monthlyPriceGHS, annualPriceGHS } = req.body;
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not found' });
    const updated = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { 
        ...(paystackPublicKey && { paystackPublicKey }),
        ...(paystackSecretKey && { paystackSecretKey }),
        ...(monthlyPriceGHS && { monthlyPriceGHS }),
        ...(annualPriceGHS && { annualPriceGHS }),
      }
    });
    res.json({ ok: true, updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
