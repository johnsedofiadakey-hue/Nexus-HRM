import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', completeTask);

router.get('/templates', authorize(['MD', 'HR_ADMIN']), getTemplates);
router.post('/templates', authorize(['MD', 'HR_ADMIN']), createTemplate);
router.post('/start', authorize(['MD', 'HR_ADMIN']), startOnboarding);
router.get('/all', authorize(['MD', 'HR_ADMIN']), getAllOnboardingSessions);

export default router;
