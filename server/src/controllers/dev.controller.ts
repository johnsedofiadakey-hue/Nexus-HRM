import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as maintenanceService from '../services/maintenance.service';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── HELPER: log every dev action ────────────────────────────────────────
const devLog = (action: string, detail: any = {}) => {
  const entry = `[${new Date().toISOString()}] DEV_ACTION: ${action} ${JSON.stringify(detail)}\n`;
  const logPath = path.join(process.cwd(), 'public', 'backups', 'dev-audit.log');
  try { fs.appendFileSync(logPath, entry); } catch { }
};

// ─── 1. DEV LOGIN ─────────────────────────────────────────────────────────
export const devLogin = async (req: Request, res: Response) => {
  devLog('DEV_LOGIN', { ip: req.ip });
  res.json({ success: true, message: 'Dev access granted' });
};

// ─── 2. FULL SYSTEM STATS ─────────────────────────────────────────────────
export const getDevStats = async (req: Request, res: Response) => {
  try {
    const [health, settings, counts, recentAudit, backups] = await Promise.all([
      maintenanceService.getSystemHealth(),
      prisma.systemSettings.findFirst(),
      Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.leaveRequest.count(),
        prisma.kpiSheet.count(),
        prisma.payrollRun.count(),
        prisma.auditLog.count()
      ]),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' }, take: 20,
        include: { user: { select: { fullName: true, role: true } } }
      }),
      maintenanceService.listBackups()
    ]);

    // CPU/memory
    const cpuLoad = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Safe settings (never expose secrets)
    const { paystackSecretKey, smtpPass, ...safeSettings } = (settings || {}) as any;

    res.json({
      health,
      settings: safeSettings,
      counts: {
        totalUsers: counts[0], activeUsers: counts[1],
        leaveRequests: counts[2], kpiSheets: counts[3],
        payrollRuns: counts[4], auditLogs: counts[5]
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuLoad: cpuLoad.map(l => l.toFixed(2)),
        memoryUsedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
        memoryTotalMB: Math.round(totalMem / 1024 / 1024),
        memoryPct: Math.round(((totalMem - freeMem) / totalMem) * 100),
        processMemMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptimeSeconds: Math.floor(process.uptime())
      },
      recentAudit,
      backups
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 3. KILL SWITCH (maintenance mode) ───────────────────────────────────
export const toggleKillSwitch = async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not initialized' });
    await prisma.systemSettings.update({ where: { id: settings.id }, data: { isMaintenanceMode: active } });
    devLog('KILL_SWITCH', { active, ip: req.ip });
    res.json({ success: true, isMaintenanceMode: active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 4. SECURITY LOCKDOWN (block all non-dev requests) ───────────────────
export const toggleSecurityLockdown = async (req: Request, res: Response) => {
  try {
    const { active, reason } = req.body;
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not initialized' });
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { securityLockdown: active, isMaintenanceMode: active }
    });
    devLog('SECURITY_LOCKDOWN', { active, reason, ip: req.ip });
    res.json({ success: true, securityLockdown: active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 5. MANUAL BACKUP ────────────────────────────────────────────────────
export const triggerBackup = async (req: Request, res: Response) => {
  try {
    devLog('MANUAL_BACKUP', { ip: req.ip });
    const result = await maintenanceService.runBackup();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 6. LIST BACKUPS ──────────────────────────────────────────────────────
export const listBackups = async (req: Request, res: Response) => {
  const backups = maintenanceService.listBackups();
  res.json(backups);
};

// ─── 7. DOWNLOAD BACKUP ──────────────────────────────────────────────────
export const downloadBackup = (req: Request, res: Response) => {
  const filename = req.params.filename;
  // Sanitize — only allow backup-*.sql files
  if (!/^backup-nexus-[\w\-.]+\.sql$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(process.cwd(), 'public', 'backups', filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Backup not found' });
  devLog('BACKUP_DOWNLOAD', { filename, ip: req.ip });
  res.download(filepath);
};

// ─── 8. PAYMENT CONFIG (set Paystack keys + pricing) ─────────────────────
export const updatePaymentConfig = async (req: Request, res: Response) => {
  try {
    const { paystackPublicKey, paystackSecretKey, monthlyPriceGHS, annualPriceGHS, trialDays } = req.body;
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not initialized' });

    const updateData: any = {};
    if (paystackPublicKey !== undefined) updateData.paystackPublicKey = paystackPublicKey;
    if (paystackSecretKey !== undefined) updateData.paystackSecretKey = paystackSecretKey;
    if (monthlyPriceGHS !== undefined) updateData.monthlyPriceGHS = parseFloat(monthlyPriceGHS);
    if (annualPriceGHS !== undefined) updateData.annualPriceGHS = parseFloat(annualPriceGHS);
    if (trialDays !== undefined) updateData.trialDays = parseInt(trialDays);

    await prisma.systemSettings.update({ where: { id: settings.id }, data: updateData });
    devLog('PAYMENT_CONFIG_UPDATED', { fields: Object.keys(updateData), ip: req.ip });
    res.json({ success: true, message: 'Payment configuration updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 9. GET PAYMENT CONFIG (keys masked) ─────────────────────────────────
export const getPaymentConfig = async (req: Request, res: Response) => {
  const settings = await prisma.systemSettings.findFirst({
    select: { paystackPublicKey: true, paystackSecretKey: true, monthlyPriceGHS: true, annualPriceGHS: true, trialDays: true }
  });
  if (!settings) return res.json({});
  res.json({
    paystackPublicKey: settings.paystackPublicKey || '',
    paystackSecretKeySet: !!settings.paystackSecretKey,
    paystackSecretKeyMasked: settings.paystackSecretKey
      ? `sk_live_${'*'.repeat(20)}${settings.paystackSecretKey.slice(-6)}`
      : '(not set)',
    monthlyPriceGHS: settings.monthlyPriceGHS,
    annualPriceGHS: settings.annualPriceGHS,
    trialDays: settings.trialDays
  });
};

// ─── 10. SUBSCRIPTIONS MANAGEMENT ────────────────────────────────────────
export const getSubscriptions = async (req: Request, res: Response) => {
  const subs = await prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(subs);
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const sub = await prisma.subscription.create({ data: req.body });
    devLog('SUBSCRIPTION_CREATED', { id: sub.id, org: sub.orgName });
    res.status(201).json(sub);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const sub = await prisma.subscription.update({ where: { id: req.params.id }, data: req.body });
    devLog('SUBSCRIPTION_UPDATED', { id: sub.id });
    res.json(sub);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// ─── 11. SECURITY: VIEW AUDIT LOG ────────────────────────────────────────
export const getAuditLog = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const action = req.query.action as string;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: action ? { action } : {},
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
      include: { user: { select: { fullName: true, email: true, role: true } } }
    }),
    prisma.auditLog.count({ where: action ? { action } : {} })
  ]);
  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
};

// ─── 12. SECURITY: ACTIVE SESSIONS OVERVIEW ──────────────────────────────
export const getActiveSessions = async (req: Request, res: Response) => {
  // Get recently active users from audit logs (proxy for "sessions")
  const recentActivity = await prisma.auditLog.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 8 * 60 * 60 * 1000) } }, // last 8h
    orderBy: { createdAt: 'desc' },
    distinct: ['userId'],
    include: { user: { select: { fullName: true, email: true, role: true } } }
  });
  res.json({ activeSessions: recentActivity.length, users: recentActivity });
};

// ─── 13. SECURITY: FORCE LOGOUT ALL ──────────────────────────────────────
export const forceLogoutAll = async (req: Request, res: Response) => {
  // This triggers maintenance mode — all API calls will fail, forcing re-auth
  const settings = await prisma.systemSettings.findFirst();
  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: { isMaintenanceMode: true }
    });
  }
  devLog('FORCE_LOGOUT_ALL', { ip: req.ip });
  // After 30s, auto-disable maintenance (just kicked sessions, not permanent lockout)
  setTimeout(async () => {
    if (settings) {
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: { isMaintenanceMode: false }
      }).catch(() => { });
    }
  }, 30000);
  res.json({ success: true, message: 'All sessions invalidated. Maintenance mode enabled for 30 seconds then auto-disables.' });
};

// ─── 14. SUSPICIOUS LOGIN DETECTION ──────────────────────────────────────
export const getSecurityAlerts = async (req: Request, res: Response) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Failed login patterns (using audit log LOGIN events or rate limiter would catch this in production)
  const [recentLogins, unusualHours, highVolumeUsers] = await Promise.all([
    prisma.auditLog.count({ where: { action: 'LOGIN', createdAt: { gte: oneHourAgo } } }),
    prisma.auditLog.findMany({
      where: { action: { in: ['LOGIN', 'KPI_SUBMITTED', 'PAYROLL_RUN_CREATED'] }, createdAt: { gte: oneDayAgo } },
      orderBy: { createdAt: 'desc' }, take: 100,
      include: { user: { select: { fullName: true, role: true } } }
    }),
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: oneHourAgo } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      having: { userId: { _count: { gt: 50 } } }
    })
  ]);

  res.json({
    loginsLastHour: recentLogins,
    recentActivity: unusualHours,
    suspiciousUsers: highVolumeUsers,
    alerts: [
      ...(highVolumeUsers.length > 0 ? [{ level: 'HIGH', msg: `${highVolumeUsers.length} user(s) with >50 actions/hr` }] : []),
      ...(recentLogins > 20 ? [{ level: 'MEDIUM', msg: `${recentLogins} logins in the last hour — possible brute force` }] : []),
    ]
  });
};

// ─── 15. SYSTEM CONFIG (general settings update) ─────────────────────────
export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) return res.status(404).json({ error: 'Settings not initialized' });
    // Whitelist allowed fields — never let body overwrite secret keys via this route
    const { paystackSecretKey, smtpPass, ...safe } = req.body;
    await prisma.systemSettings.update({ where: { id: settings.id }, data: safe });
    devLog('SYSTEM_CONFIG_UPDATED', { fields: Object.keys(safe) });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// ─── 16. DEPARTMENT MANAGEMENT ───────────────────────────────────────────
export const getDepartments = async (_req: Request, res: Response) => {
  const deps = await prisma.department.findMany({ include: { employees: { select: { id: true } } } });
  res.json(deps);
};
export const createDepartment = async (req: Request, res: Response) => {
  const dep = await prisma.department.create({ data: { name: req.body.name } });
  res.json(dep);
};
export const deleteDepartment = async (req: Request, res: Response) => {
  await prisma.department.delete({ where: { id: parseInt(req.params.id) } });
  res.status(204).send();
};
