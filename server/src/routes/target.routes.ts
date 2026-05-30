import { Router } from 'express';
import * as TargetController from '../controllers/target.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  CreateTargetSchema,
  UpdateTargetSchema,
  UpdateTargetProgressSchema,
  ReviewTargetSchema,
  CascadeTargetSchema,
  AcknowledgeTargetSchema,
} from '../middleware/validate.middleware';

const router = Router();
router.use(authenticate);

// ── LIST ──────────────────────────────────────────────────────────────────────
// GET /targets           — my targets (assignee) + targets I manage (lineManager/reviewer)
router.get('/', TargetController.getTargets);

// GET /targets/team      — targets I assigned / manage (Manager+)
router.get('/team', requireRole(60), TargetController.getTeamTargets);

// GET /targets/department — department-level targets (Director+)
router.get('/department', requireRole(80), TargetController.getDepartmentTargets);

// GET /targets/strategic — strategic rollup for a parent (Director+)
router.get('/strategic/:id', requireRole(80), TargetController.getStrategicRollup);

// ── SINGLE RESOURCE ───────────────────────────────────────────────────────────
router.get('/:id', TargetController.getTarget);
router.patch('/:id', requireRole(60), validate(UpdateTargetSchema), TargetController.updateTarget);
router.delete('/:id', requireRole(60), TargetController.deleteTarget);

// ── ACTIONS (on a target) ─────────────────────────────────────────────────────
router.post('/:id/acknowledge', validate(AcknowledgeTargetSchema), TargetController.acknowledge);
router.post('/:id/progress', validate(UpdateTargetProgressSchema), TargetController.updateProgress);
router.post('/:id/review', requireRole(60), validate(ReviewTargetSchema), TargetController.reviewTarget);
router.post('/:id/cascade', requireRole(60), validate(CascadeTargetSchema), TargetController.cascadeTarget);

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', requireRole(60), validate(CreateTargetSchema), TargetController.createTarget);

export default router;
