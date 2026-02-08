import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as maintenanceController from '../controllers/maintenance.controller';

const router = Router();

// Only Super Admin or maybe MD can trigger backups? 
// User said "automatic back up... quick fix".
// Let's allow MD and SUPER_ADMIN.
router.post('/backup', authenticate, authorize(['MD', 'SUPER_ADMIN']), maintenanceController.triggerBackup);
router.get('/health', authenticate, authorize(['MD', 'SUPER_ADMIN']), maintenanceController.checkHealth);

export default router;
