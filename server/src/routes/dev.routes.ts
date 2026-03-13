import { Router } from 'express';
import * as devController from '../controllers/dev.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(requireRole(100)); // DEV only

router.get('/health', devController.getSystemHealth);
router.get('/stats', devController.getStats);
router.get('/security-alerts', devController.getSecurityAlerts);
router.get('/backups', devController.getBackups);
router.get('/backup/logs', devController.getBackups);  // client calls /backup/logs
router.get('/audit-log', devController.getAuditLog);
router.get('/subscriptions', devController.getSubscriptions);
router.get('/payment-config', devController.getPaymentConfig);
router.get('/settings', devController.getPaymentConfig); // dev settings view alias
router.get('/users', devController.getUsers);

router.get('/organizations', devController.getOrganizations);
router.post('/organizations', devController.createOrganization);
router.patch('/organizations/:id', devController.updateOrganization);
router.delete('/organizations/:id', devController.deleteOrganization);

router.post('/impersonate', devController.impersonateUser);
router.post('/backup', devController.triggerBackup);
router.post('/kill-switch', devController.killSwitch);
router.post('/security-lockdown', devController.securityLockdown);
router.post('/force-logout-all', devController.forceLogoutAll);
router.post('/settings', devController.updatePaymentConfig);

export default router;
