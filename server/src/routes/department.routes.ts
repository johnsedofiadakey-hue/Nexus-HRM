import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, CreateDepartmentSchema } from '../middleware/validate.middleware';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';

const router = Router();
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', requireRole(75), validate(CreateDepartmentSchema), createDepartment);
router.put('/:id', requireRole(75), validate(CreateDepartmentSchema.partial()), updateDepartment);
router.patch('/:id', requireRole(75), validate(CreateDepartmentSchema.partial()), updateDepartment);
router.delete('/:id', requireRole(85), deleteDepartment);

export default router;
