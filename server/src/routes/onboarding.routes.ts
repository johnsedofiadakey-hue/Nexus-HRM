import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', completeTask);

router.get('/templates', requireRole(80), getTemplates);
router.post('/templates', requireRole(80), createTemplate);
router.post('/start', requireRole(80), startOnboarding);
router.get('/all', requireRole(80), getAllOnboardingSessions);

export default router;
