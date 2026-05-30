import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  OnboardingTemplateSchema,
  StartOnboardingSchema,
  CompleteOnboardingTaskSchema,
} from '../middleware/validate.middleware';
import { getTemplates, createTemplate, startOnboarding, getMyOnboarding, completeTask, getAllOnboardingSessions } from '../controllers/onboarding.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyOnboarding);
router.post('/task/complete', validate(CompleteOnboardingTaskSchema), completeTask);

router.get('/templates', requireRole(85), getTemplates);
router.post('/templates', requireRole(85), validate(OnboardingTemplateSchema), createTemplate);
router.post('/start', requireRole(85), validate(StartOnboardingSchema), startOnboarding);
router.get('/all', requireRole(85), getAllOnboardingSessions);

export default router;
