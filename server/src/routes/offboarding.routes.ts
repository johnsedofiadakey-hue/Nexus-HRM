import { Router } from 'express';
import * as offboardingController from '../controllers/offboarding.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Initiation & Status Update (Rank 70+ HR Manager/MD)
router.post('/initiate', authenticate, requireRole(RoleRank.HR_MANAGER), offboardingController.initiateOffboarding);
router.get('/list', authenticate, requireRole(RoleRank.HR_MANAGER), offboardingController.getOffboardingList);
router.patch('/:id/complete', authenticate, requireRole(RoleRank.HR_MANAGER), offboardingController.completeOffboarding);

// Exit Interview
router.patch('/:offboardingId/interview', authenticate, requireRole(RoleRank.HR_MANAGER), offboardingController.updateExitInterview);

// Assets
router.post('/assets/return', authenticate, requireRole(RoleRank.HR_MANAGER), offboardingController.trackAssetReturn);

export default router;
