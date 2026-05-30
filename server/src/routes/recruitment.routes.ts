import { Router } from 'express';
import * as recruitmentController from '../controllers/recruitment.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  CreateJobSchema,
  UpdateJobSchema,
  ApplyForJobSchema,
  UpdateCandidateStatusSchema,
  ScheduleInterviewSchema,
  InterviewFeedbackSchema,
} from '../middleware/validate.middleware';
import { RoleRank } from '../types/roles';

const router = Router();

router.get('/jobs', authenticate, recruitmentController.getJobPositions);
router.post('/apply', validate(ApplyForJobSchema), recruitmentController.applyForJob);

router.post('/jobs', authenticate, requireRole(RoleRank.HR_OFFICER), validate(CreateJobSchema), recruitmentController.createJobPosition);
router.patch('/jobs/:id', authenticate, requireRole(RoleRank.HR_OFFICER), validate(UpdateJobSchema), recruitmentController.updateJobPosition);
router.delete('/jobs/:id', authenticate, requireRole(RoleRank.DIRECTOR), recruitmentController.deleteJobPosition);

router.get('/candidates', authenticate, requireRole(RoleRank.HR_OFFICER), recruitmentController.getCandidates);
router.patch('/candidates/:id/status', authenticate, requireRole(RoleRank.HR_OFFICER), validate(UpdateCandidateStatusSchema), recruitmentController.updateCandidateStatus);

router.post('/interviews/schedule', authenticate, requireRole(RoleRank.HR_OFFICER), validate(ScheduleInterviewSchema), recruitmentController.scheduleInterview);
router.post('/interviews/feedback', authenticate, validate(InterviewFeedbackSchema), recruitmentController.submitInterviewFeedback);

export default router;
