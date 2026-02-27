import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { clockIn, clockOut, getMyAttendance, getAllAttendance } from '../controllers/attendance.controller';

const router = Router();
router.use(authenticate);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/me', getMyAttendance);
router.get('/', authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), getAllAttendance);

export default router;
