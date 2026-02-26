import { Router } from 'express';
import {
  devLogin, getDevStats, toggleKillSwitch, toggleSecurityLockdown,
  triggerBackup, listBackups, downloadBackup,
  updatePaymentConfig, getPaymentConfig,
  getSubscriptions, createSubscription, updateSubscription,
  getAuditLog, getActiveSessions, forceLogoutAll, getSecurityAlerts,
  updateSystemConfig, getDepartments, createDepartment, deleteDepartment
} from '../controllers/dev.controller';

const router = Router();

// All dev routes require the master key header (checked in app.ts devKeyMiddleware)
router.post('/login', devLogin);
router.get('/stats', getDevStats);

// Kill switch / lockdown
router.post('/kill-switch', toggleKillSwitch);
router.post('/security-lockdown', toggleSecurityLockdown);
router.post('/force-logout-all', forceLogoutAll);

// Backup
router.post('/backup', triggerBackup);
router.get('/backups', listBackups);
router.get('/backups/:filename', downloadBackup);

// Payment config
router.get('/payment-config', getPaymentConfig);
router.post('/payment-config', updatePaymentConfig);

// Subscriptions
router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions', createSubscription);
router.patch('/subscriptions/:id', updateSubscription);

// Security monitoring
router.get('/audit-log', getAuditLog);
router.get('/active-sessions', getActiveSessions);
router.get('/security-alerts', getSecurityAlerts);

// System config
router.post('/config', updateSystemConfig);

// Departments
router.get('/departments', getDepartments);

// Employee read-only overview (dev portal)
router.get('/users', async (req, res) => {
  const { PrismaClient } = await import('@prisma/client');
  const p = new (PrismaClient as any)();
  const users = await p.user.findMany({
    select: { id: true, fullName: true, email: true, role: true, status: true, employeeCode: true, jobTitle: true, joinDate: true, departmentObj: { select: { name: true } } },
    orderBy: { fullName: 'asc' }
  });
  res.json(users.map((u: any) => ({ ...u, department: u.departmentObj?.name })));
  await p.$disconnect();
});
router.post('/departments', createDepartment);
router.delete('/departments/:id', deleteDepartment);

export default router;
