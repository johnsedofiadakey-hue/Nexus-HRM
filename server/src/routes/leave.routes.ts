import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  applyForLeave,
  getMyLeaves,
  getMyLeaveBalance,
  getPendingLeaves,
  processLeave,
  cancelLeave,
  getAllLeaves,
  getMyReliefRequests,
  getEligibleRelievers,
} from '../controllers/leave.controller';

const router = Router();
router.use(authenticate);

// Employee self-service
router.post('/apply', applyForLeave);
router.get('/my', getMyLeaves);
router.get('/balance', getMyLeaveBalance);
router.get('/my-relief-requests', getMyReliefRequests);
router.get('/eligible-relievers', getEligibleRelievers);
router.delete('/:id/cancel', cancelLeave);

// Manager / HR processing
router.get('/pending', requireRole(60), getPendingLeaves);
router.post('/process', requireRole(60), processLeave);

// Admin view (rank 80+ ONLY — fixes L4)
router.get('/all', requireRole(80), getAllLeaves);

export default router;
