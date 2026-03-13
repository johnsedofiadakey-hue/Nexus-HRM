import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/department.controller';

const router = Router();
router.use(authenticate);

router.get('/', getDepartments);
router.post('/', requireRole(70), createDepartment);
router.put('/:id', requireRole(70), updateDepartment);
router.patch('/:id', requireRole(70), updateDepartment);
router.delete('/:id', requireRole(80), deleteDepartment);

export default router;
