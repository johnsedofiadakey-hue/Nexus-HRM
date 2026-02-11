import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getDepartments } from '../controllers/department.controller';

const router = Router();

router.get('/', authenticate, getDepartments);

export default router;
