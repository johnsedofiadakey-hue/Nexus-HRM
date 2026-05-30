import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, CreateSubUnitSchema, UpdateSubUnitSchema } from '../middleware/validate.middleware';
import {
  getSubUnits,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit
} from '../controllers/sub-unit.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSubUnits);
router.post('/', requireRole(75), validate(CreateSubUnitSchema), createSubUnit);
router.patch('/:id', requireRole(75), validate(UpdateSubUnitSchema), updateSubUnit);
router.delete('/:id', requireRole(75), deleteSubUnit);

export default router;
