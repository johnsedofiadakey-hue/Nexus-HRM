import { Router } from 'express';
import * as cycleController from '../controllers/cycle.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, CreateCycleSchema, UpdateCycleStatusSchema } from '../middleware/validate.middleware';
import { requireDestructiveOperationsEnabled } from '../middleware/data-safety.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(80), validate(CreateCycleSchema), cycleController.createCycle);
router.get('/', cycleController.getCycles);
router.patch('/:id/status', requireRole(80), validate(UpdateCycleStatusSchema), cycleController.updateCycleStatus);
router.put('/:id', requireRole(80), validate(UpdateCycleStatusSchema), cycleController.updateCycleStatus);
router.delete(
  '/:id',
  requireRole(80),
  requireDestructiveOperationsEnabled('HARD_DELETE_REVIEW_CYCLE'),
  cycleController.deleteCycle
);

export default router;
