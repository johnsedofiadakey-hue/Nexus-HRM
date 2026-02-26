import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { applyForLeave, getMyLeaves, getMyLeaveBalance, getPendingLeaves, processLeave, cancelLeave, getAllLeaves } from '../controllers/leave.controller';

const router = Router();

router.use(authenticate);

router.post('/apply', applyForLeave);
router.get('/my', getMyLeaves);
router.get('/balance', getMyLeaveBalance);
router.delete('/:id/cancel', cancelLeave);

// Manager routes
router.get('/pending', authorize(['MD', 'HR_ADMIN', 'SUPERVISOR']), getPendingLeaves);
router.post('/process', authorize(['MD', 'HR_ADMIN', 'SUPERVISOR']), processLeave);

// Admin routes
router.get('/all', authorize(['MD', 'HR_ADMIN']), getAllLeaves);

export default router;
