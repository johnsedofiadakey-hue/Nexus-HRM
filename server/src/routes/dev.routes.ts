import { Router } from 'express';
import { authenticate, authorizeMinimumRole } from '../middleware/auth.middleware';
import { getSystemSettings, updateSystemSettings, getSystemHealth, triggerBackup, getBackupLogs } from '../controllers/dev.controller';

const router = Router();

// Only DEV can access these routes
router.use(authenticate, authorizeMinimumRole('DEV'));

// System Settings
router.get('/settings', getSystemSettings);
router.post('/settings', updateSystemSettings);

// Health & Stats
router.get('/health', getSystemHealth);

// Backups
router.post('/backup', triggerBackup);
router.get('/backup/logs', getBackupLogs);

export default router;
