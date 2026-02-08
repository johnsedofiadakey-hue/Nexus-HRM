import { Router } from 'express';
import { devGuard } from '../middleware/dev.guard';
import * as devController from '../controllers/dev.controller';

const router = Router();

// Apply Guard to ALL dev routes
router.use(devGuard);

router.post('/login', devController.devLogin);
router.get('/stats', devController.getDevStats);
router.post('/kill-switch', devController.toggleKillSwitch);
router.put('/config', devController.updateSystemConfig);

// Specific backup trigger for Dev
import { triggerBackup } from '../controllers/maintenance.controller';
router.post('/backup', triggerBackup);

export default router;
