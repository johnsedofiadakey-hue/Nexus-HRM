import { Router } from 'express';
import {
  getSystemStats,
  checkIntegrity,
  getSecurityTelemetry,
  toggleTenantFeature,
  extendTrial,
  getSystemLogs,
  triggerBackup
} from '../controllers/dev.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, authorize(['DEV']), getSystemStats);
router.get('/integrity', authenticate, authorize(['DEV']), checkIntegrity);
router.get('/telemetry', authenticate, authorize(['DEV']), getSecurityTelemetry);
router.post('/tenant/feature', authenticate, authorize(['DEV']), toggleTenantFeature);
router.post('/tenant/trial', authenticate, authorize(['DEV']), extendTrial);
router.get('/logs', authenticate, authorize(['DEV']), getSystemLogs);
router.post('/backup', authenticate, authorize(['DEV']), triggerBackup);

export default router;
