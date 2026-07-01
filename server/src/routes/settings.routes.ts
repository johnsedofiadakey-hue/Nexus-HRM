import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/settings.controller';
import { PurgeService } from '../services/purge.service';
import { requireDestructiveOperationsEnabled } from '../middleware/data-safety.middleware';

const router = Router();

// Public — branding loads on login page before auth
router.get('/', settingsController.getSettings);
router.get('/organization', settingsController.getSettings);

// Admin Only Update
router.put('/', authenticate, requireRole(90), settingsController.updateSettings);
router.patch('/organization', authenticate, requireRole(90), settingsController.updateSettings);
router.put('/organization', authenticate, requireRole(90), settingsController.updateSettings);

// DANGER: Purge all transactional data (MD/DEV only — production onboarding)
router.post(
  '/purge-data',
  authenticate,
  requireRole(90),
  requireDestructiveOperationsEnabled('PURGE_TENANT_DATA'),
  async (req: any, res: any) => {
    const { pin } = req.body;
    const configuredPin = process.env.DESTRUCTIVE_OPERATION_PIN;

    if (!configuredPin || pin !== configuredPin) {
      return res.status(403).json({ error: 'Security PIN verification failed. Access denied.' });
    }

    try {
      const organizationId = req.user?.organizationId ?? 'default-tenant';
      const result = await PurgeService.purgeTransactionalData(organizationId);
      res.json({ success: true, message: 'All transactional data has been permanently wiped.', ...result });
    } catch (err: any) {
      console.error('[PURGE] Error:', err);
      res.status(500).json({ error: err.message || 'Purge failed' });
    }
  }
);

export default router;
