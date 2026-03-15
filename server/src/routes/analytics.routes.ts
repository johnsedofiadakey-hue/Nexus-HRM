import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/executive', requireRole(70), analyticsController.getExecutiveStats); // Manager+
router.get('/dept-growth', requireRole(80), analyticsController.getDepartmentGrowth); // Director+
router.get('/personal', analyticsController.getPersonalStats); // Any authenticated user (Staff)

export default router;
