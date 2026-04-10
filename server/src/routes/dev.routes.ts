import { Router } from 'express';
import {
  getSystemStats,
  checkIntegrity,
  getSecurityTelemetry,
  toggleTenantFeature,
  extendTrial,
  getSystemLogs,
  getTenantDetails,
  triggerBackup,
  grantBankTransferAccess,
  getApiUsageStats,
  bulkTenantAction,
  listOrganizations,
  createOrganization,
  listAllUsers,
  seedDemoTenant,
} from '../controllers/dev.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, authorize(['DEV']), getSystemStats);
router.get('/integrity', authenticate, authorize(['DEV']), checkIntegrity);
router.get('/telemetry', authenticate, authorize(['DEV']), getSecurityTelemetry);
router.get('/telemetry/api', authenticate, authorize(['DEV']), getApiUsageStats);
router.post('/tenant/feature', authenticate, authorize(['DEV']), toggleTenantFeature);
router.post('/tenant/trial', authenticate, authorize(['DEV']), extendTrial);
router.post('/tenant/bulk-action', authenticate, authorize(['DEV']), bulkTenantAction);
router.get('/logs', authenticate, authorize(['DEV']), getSystemLogs);
router.get('/tenant/:id', authenticate, authorize(['DEV']), getTenantDetails);
router.post('/backup', authenticate, authorize(['DEV']), triggerBackup);
router.post('/grant-bank-access', authenticate, authorize(['DEV']), grantBankTransferAccess);

// Tenant/Organization management
router.get('/organizations', authenticate, authorize(['DEV']), listOrganizations);
router.post('/organizations', authenticate, authorize(['DEV']), createOrganization);
router.get('/users', authenticate, authorize(['DEV']), listAllUsers);
router.post('/tenant/seed-demo', authenticate, authorize(['DEV']), seedDemoTenant);

export default router;
