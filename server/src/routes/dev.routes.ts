import { Router } from 'express';
import { getSystemStats, checkIntegrity } from '../controllers/dev.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, authorize(['DEV']), getSystemStats);
router.get('/integrity', authenticate, authorize(['DEV']), checkIntegrity);

export default router;
