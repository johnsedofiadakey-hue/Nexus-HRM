import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getHolidays, addHoliday, deleteHoliday, seedGhanaHolidays } from '../controllers/holiday.controller';

const router = Router();
router.use(authenticate);

router.get('/', getHolidays);
router.post('/', authorize(['MD', 'HR_ADMIN']), addHoliday);
router.delete('/:id', authorize(['MD', 'HR_ADMIN']), deleteHoliday);
router.post('/seed-ghana', authorize(['MD', 'HR_ADMIN']), seedGhanaHolidays);

export default router;
