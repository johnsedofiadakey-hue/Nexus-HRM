import { Router } from 'express';
import * as TargetController from '../controllers/target.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All target routes require authentication
router.use(authenticate);

router.post('/', TargetController.createTarget);
router.post('/cascade', TargetController.cascadeTarget);
router.post('/acknowledge', TargetController.acknowledge);
router.post('/progress', TargetController.updateProgress);
router.post('/review', TargetController.reviewTarget);

export default router;
