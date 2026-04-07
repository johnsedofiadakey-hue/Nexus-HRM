import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { itCreateEmployee, itResetPassword, itSystemOverview, itGetUsers, itDeactivateUser, itCleanupLogs } from '../controllers/itadmin.controller';
import { validateHierarchy } from '../controllers/hierarchy.controller';

const router = Router();
router.use(authenticate);

// System overview — Director+ can view
router.get('/overview', requireRole(80), itSystemOverview);

// User management — Manager+ can manage accounts
router.get('/users', requireRole(70), itGetUsers);
router.post('/users', requireRole(70), itCreateEmployee);
router.post('/users/:userId/reset-password', requireRole(70), itResetPassword);
router.patch('/users/:userId/deactivate', requireRole(70), itDeactivateUser);

// Maintenance — MD only
router.post('/maintenance/cleanup-logs', requireRole(90), itCleanupLogs);

// Hierarchy validation — any authenticated user
router.post('/hierarchy/validate', validateHierarchy);

export default router;
