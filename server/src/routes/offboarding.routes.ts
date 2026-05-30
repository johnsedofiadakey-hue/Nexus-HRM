import { Router } from 'express';
import * as offboardingController from '../controllers/offboarding.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  OffboardingTemplateSchema,
  InitiateOffboardingSchema,
  CompleteOffboardingTaskSchema,
  UpdateExitInterviewSchema,
  OffboardingAssetReturnSchema,
} from '../middleware/validate.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

// Templates
router.get('/templates', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.getTemplates);
router.post('/templates', authenticate, requireRole(RoleRank.HR_OFFICER), validate(OffboardingTemplateSchema), offboardingController.createTemplate);

// Initiation & Status Update
router.post('/initiate', authenticate, requireRole(RoleRank.HR_OFFICER), validate(InitiateOffboardingSchema), offboardingController.initiateOffboarding);
router.get('/list', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.getOffboardingList);
router.get('/:id', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.getOffboardingDetails);
router.patch('/:id/complete', authenticate, requireRole(RoleRank.HR_OFFICER), offboardingController.completeOffboarding);

// Clearance Tasks
router.post('/task/complete', authenticate, requireRole(RoleRank.HR_OFFICER), validate(CompleteOffboardingTaskSchema), offboardingController.completeClearanceTask);

// Exit Interview
router.patch('/:offboardingId/interview', authenticate, requireRole(RoleRank.HR_OFFICER), validate(UpdateExitInterviewSchema), offboardingController.updateExitInterview);

// Assets
router.post('/assets/return', authenticate, requireRole(RoleRank.HR_OFFICER), validate(OffboardingAssetReturnSchema), offboardingController.trackAssetReturn);

// Administrative Deletion (MD Only)
router.delete('/:id', authenticate, requireRole(85), offboardingController.deleteOffboarding);

export default router;
