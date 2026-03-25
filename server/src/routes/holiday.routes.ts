import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { getHolidays, addHoliday, deleteHoliday, seedGuineaHolidays } from '../controllers/holiday.controller';

const router = Router();
router.use(authenticate);

router.get('/', getHolidays);
router.post('/', requireRole(80), addHoliday);
router.delete('/:id', requireRole(80), deleteHoliday);
router.post('/seed-guinea', requireRole(80), seedGuineaHolidays);

export default router;
