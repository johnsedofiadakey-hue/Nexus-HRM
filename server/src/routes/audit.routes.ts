import { Router } from 'express';
import { authenticate, requireRole, authorizeMinimumRole } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Only HR_ADMIN and MD can view audit logs
router.get('/', authenticate, requireRole(80), auditController.getLogs);
router.get('/logs', authenticate, requireRole(80), auditController.getLogs); // client calls /logs

export default router;
