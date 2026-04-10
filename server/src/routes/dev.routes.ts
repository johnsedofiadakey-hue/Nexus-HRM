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
import { shadowAuth } from '../middleware/shadowAuth.middleware';

const router = Router();

router.get('/stats', shadowAuth, getSystemStats);
router.get('/integrity', shadowAuth, checkIntegrity);
router.get('/telemetry', shadowAuth, getSecurityTelemetry);
router.get('/telemetry/api', shadowAuth, getApiUsageStats);
router.post('/tenant/feature', shadowAuth, toggleTenantFeature);
router.post('/tenant/trial', shadowAuth, extendTrial);
router.post('/tenant/bulk-action', shadowAuth, bulkTenantAction);
router.get('/logs', shadowAuth, getSystemLogs);
router.get('/tenant/:id', shadowAuth, getTenantDetails);
router.post('/backup', shadowAuth, triggerBackup);
router.post('/grant-bank-access', shadowAuth, grantBankTransferAccess);

// Tenant/Organization management
router.get('/organizations', shadowAuth, listOrganizations);
router.post('/organizations', shadowAuth, createOrganization);
router.get('/users', shadowAuth, listAllUsers);
router.post('/tenant/seed-demo', shadowAuth, seedDemoTenant);

export default router;
