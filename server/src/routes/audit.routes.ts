import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = Router();

// Only HR_ADMIN and MD can view audit logs
router.get('/', authenticate, authorize(['HR_ADMIN', 'MD']), auditController.getLogs);

export default router;
