import { Router } from 'express';
import { getMyTeam } from '../controllers/user.controller';

const router = Router();

// GET /api/team/list?supervisorId=...
router.get('/list', getMyTeam);

export default router;