import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();

router.post('/init', authenticate, requireRole(80), appraisalController.initiateCycle);
router.get('/my-latest', authenticate, appraisalController.getMyLatest);
router.get('/team', authenticate, requireRole(60), appraisalController.getTeamAppraisals);
router.post('/self-rating', authenticate, appraisalController.submitSelf);
router.post('/manager-rating', authenticate, requireRole(60), appraisalController.submitManager);
router.get('/final-verdict-list', authenticate, requireRole(80), appraisalController.getFinalVerdictList);
router.post('/final-verdict', authenticate, requireRole(80), appraisalController.submitFinalVerdict);
router.get('/stats/:cycleId', authenticate, requireRole(60), appraisalController.getCycleStats);
// Delete endpoints
router.delete('/cycle/:cycleId', authenticate, requireRole(80), appraisalController.deleteAppraisalsByCycle);
router.delete('/:id', authenticate, requireRole(80), appraisalController.deleteAppraisal);

export default router;

