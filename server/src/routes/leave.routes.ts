import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  LeaveRequestSchema,
  LeaveDaysSchema,
  ProcessLeaveSchema,
  AdjustLeaveBalanceSchema,
} from '../middleware/validate.middleware';
import {
  applyForLeave,
  getMyLeaves,
  getMyLeaveBalance,
  getPendingLeaves,
  processLeave,
  cancelLeave,
  cancelApprovedLeave,
  getAllLeaves,
  getMyReliefRequests,
  getEligibleRelievers,
  getHandoverHistory,
  deleteLeave,
  deleteHandover,
  adjustLeaveBalance,
  calculateLeaveDays,
} from '../controllers/leave.controller';

const router = Router();
router.use(authenticate);

// Employee self-service
router.post('/apply', validate(LeaveRequestSchema), applyForLeave);
router.post('/calculate-days', validate(LeaveDaysSchema), calculateLeaveDays);
router.get('/my', getMyLeaves);
router.get('/balance', getMyLeaveBalance);
router.get('/my-relief-requests', getMyReliefRequests);
router.get('/handover/history', getHandoverHistory);
router.get('/eligible-relievers', getEligibleRelievers);
router.delete('/:id/cancel', cancelLeave);

// HR / MD Administrative Controls
router.post('/balance/adjust', requireRole(85), validate(AdjustLeaveBalanceSchema), adjustLeaveBalance);
router.delete('/request/:id/cancel-approved', requireRole(75), cancelApprovedLeave);
router.delete('/request/:id', requireRole(90), deleteLeave);
router.delete('/handover/:id', requireRole(90), deleteHandover);

// Manager / HR processing
router.get('/pending', requireRole(60), getPendingLeaves);
// Authorization is enforced by processLeave: assigned relievers may respond at
// any rank, while management actions still require rank 60+.
router.post('/process', validate(ProcessLeaveSchema), processLeave);

// Admin view (rank 80+) OR Manager team register (rank 60+)
router.get('/all', requireRole(60), getAllLeaves);

export default router;
