import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { applyForLeave, getMyLeaves, getMyLeaveBalance, getPendingLeaves, processLeave, cancelLeave, getAllLeaves } from '../controllers/leave.controller';

const router = Router();

router.use(authenticate);

router.post('/apply', applyForLeave);
router.get('/my', getMyLeaves);
router.get('/balance', getMyLeaveBalance);
router.delete('/:id/cancel', cancelLeave);

// Manager routes
router.get('/pending', requireRole(70), getPendingLeaves);
router.post('/process', requireRole(70), processLeave);

// Admin routes
router.get('/all', requireRole(80), getAllLeaves);

export default router;
