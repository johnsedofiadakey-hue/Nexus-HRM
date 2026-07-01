import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, CreateDepartmentSchema } from '../middleware/validate.middleware';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';
import { requireDestructiveOperationsEnabled } from '../middleware/data-safety.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', requireRole(75), validate(CreateDepartmentSchema), createDepartment);
router.put('/:id', requireRole(75), validate(CreateDepartmentSchema.partial()), updateDepartment);
router.patch('/:id', requireRole(75), validate(CreateDepartmentSchema.partial()), updateDepartment);
router.delete(
  '/:id',
  requireRole(85),
  requireDestructiveOperationsEnabled('HARD_DELETE_DEPARTMENT'),
  deleteDepartment
);

export default router;
