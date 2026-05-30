import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  CreateDeptKpiSchema,
  CreateTeamTargetSchema,
  CreateEmployeeTargetSchema,
  CreateReviewSchema,
  ManagerReviewSchema,
  DirectorFinalizeSchema,
} from '../middleware/validate.middleware';
import * as controller from '../controllers/performance-v2.controller';

const router = Router();
router.use(authenticate);

// Department KPIs (Director+) — both singular and plural for compatibility
router.post('/dept-kpi', requireRole(80), validate(CreateDeptKpiSchema), controller.createDepartmentKPI);
router.get('/dept-kpi', requireRole(80), controller.getDepartmentKPIs);
router.post('/dept-kpis', requireRole(80), validate(CreateDeptKpiSchema), controller.createDepartmentKPI);
router.get('/dept-kpis', requireRole(80), controller.getDepartmentKPIs);
router.delete('/dept-kpis/:id', requireRole(80), controller.deleteDepartmentKPI);

// Team Targets (Manager+)
router.post('/team-target', requireRole(70), validate(CreateTeamTargetSchema), controller.createTeamTarget);
router.get('/team-target', requireRole(70), controller.getTeamTargets);
router.post('/team-targets', requireRole(70), validate(CreateTeamTargetSchema), controller.createTeamTarget);
router.get('/team-targets', requireRole(70), controller.getTeamTargets);

// Employee Targets
router.post('/employee-target', requireRole(70), validate(CreateEmployeeTargetSchema), controller.createEmployeeTarget);
router.post('/employee-targets', requireRole(70), validate(CreateEmployeeTargetSchema), controller.createEmployeeTarget);
router.get('/employee-targets', controller.getMyTargets);
router.patch('/employee-targets/:id', controller.updateEmployeeTarget);
router.get('/my-targets', controller.getMyTargets);

// Performance Reviews
router.post('/reviews', validate(CreateReviewSchema), controller.createReview);
router.patch('/reviews/:id/manager', requireRole(70), validate(ManagerReviewSchema), controller.managerReview);
router.patch('/reviews/:id/director', requireRole(80), validate(DirectorFinalizeSchema), controller.directorFinalize);

export default router;
