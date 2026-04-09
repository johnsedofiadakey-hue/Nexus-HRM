import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', completeTask);

router.get('/templates', requireRole(85), getTemplates);
router.post('/templates', requireRole(85), createTemplate);
router.post('/start', requireRole(85), startOnboarding);
router.get('/all', requireRole(85), getAllOnboardingSessions);

export default router;
