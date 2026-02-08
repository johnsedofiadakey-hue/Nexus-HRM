import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();

router.post('/init', authenticate, authorize(['HR_ADMIN', 'MD']), appraisalController.initiateCycle);
router.get('/my-latest', authenticate, appraisalController.getMyLatest);
router.get('/team', authenticate, authorize(['SUPERVISOR', 'HR_ADMIN', 'MD']), appraisalController.getTeamAppraisals);
router.post('/self-rating', authenticate, appraisalController.submitSelf);
router.post('/manager-rating', authenticate, authorize(['SUPERVISOR', 'HR_ADMIN', 'MD']), appraisalController.submitManager);

export default router;

