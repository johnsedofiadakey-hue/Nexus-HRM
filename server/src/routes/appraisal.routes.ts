import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();

router.post('/init', authenticate, requireRole(80), appraisalController.initiateCycle);
router.get('/my-latest', authenticate, appraisalController.getMyLatest);
router.get('/team', authenticate, requireRole(70), appraisalController.getTeamAppraisals);
router.post('/self-rating', authenticate, appraisalController.submitSelf);
router.post('/manager-rating', authenticate, requireRole(70), appraisalController.submitManager);

export default router;

