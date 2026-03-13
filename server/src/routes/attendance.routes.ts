import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { clockIn, clockOut, getMyAttendance, getAllAttendance } from '../controllers/attendance.controller';

const router = Router();
router.use(authenticate);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);
router.get('/', requireRole(70), getAllAttendance);

export default router;
