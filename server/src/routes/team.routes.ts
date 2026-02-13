import { Router } from 'express';
import { getMyTeam } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// GET /api/team/list?supervisorId=...
router.get('/list', authenticate, authorize(['SUPERVISOR', 'HR_ADMIN', 'MD']), getMyTeam);

export default router;