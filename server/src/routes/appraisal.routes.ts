import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import {
  validate,
  InitAppraisalCycleSchema,
  AppraisalReviewSchema,
  FinalSignOffSchema,
  DisputeSchema,
  ResolveDisputeSchema,
  UpdateAppraisalCycleSchema,
} from '../middleware/validate.middleware';
import * as appraisalController from '../controllers/appraisal.controller';
import { requireDestructiveOperationsEnabled } from '../middleware/data-safety.middleware';

const router = Router();

router.use(authenticate);

// Initialize a new appraisal cycle (HR/MD)
router.post('/init', requireRole(80), validate(InitAppraisalCycleSchema), appraisalController.initAppraisalCycle);

// Get my own appraisal history (Packets)
router.get('/my-packets', appraisalController.getMyPackets);

// Get packets where I am a reviewer
router.get('/team-packets', requireRole(60), appraisalController.getTeamPackets);

// Get packets awaiting final executive sign-off (MD/Director)
router.get('/final-sign-off-list', requireRole(85), appraisalController.getFinalVerdictList);

// Provide final executive sign-off
router.post('/final-sign-off', requireRole(85), validate(FinalSignOffSchema), appraisalController.finalSignOff);

// Data Integrity Purge (Ghost Cards Fix)
router.post(
  '/purge-orphans',
  requireRole(85),
  requireDestructiveOperationsEnabled('PURGE_APPRAISAL_ORPHANS'),
  appraisalController.purgeOrphanPackets
);
router.post(
  '/ultimate-reset',
  requireRole(90),
  requireDestructiveOperationsEnabled('RESET_APPRAISAL_DOMAIN'),
  appraisalController.resetAppraisalDomain
);

// Performance Trend
router.get('/trend/:employeeId', appraisalController.getPerformanceTrend);

// Appraisal Cycle Management (Director+)
router.get('/cycle/:cycleId/packets', requireRole(75), appraisalController.getCyclePackets);
router.patch('/cycle/:id', requireRole(80), validate(UpdateAppraisalCycleSchema), appraisalController.updateAppraisalCycle);
router.delete(
  '/cycle/:id',
  requireRole(80),
  requireDestructiveOperationsEnabled('HARD_DELETE_APPRAISAL_CYCLE'),
  appraisalController.deleteAppraisalCycle
);

// Dispute Management
router.post('/packet/:packetId/dispute', validate(DisputeSchema), appraisalController.raiseAppraisalDispute);
router.post('/packet/:packetId/resolve', requireRole(85), validate(ResolveDisputeSchema), appraisalController.resolveAppraisalDispute);

// Submit a review (Self or Reviewer)
router.post('/review/:packetId', validate(AppraisalReviewSchema), appraisalController.submitAppraisalReview);

// CRUD on a specific packet
router.get('/packet/:id', appraisalController.getPacketDetail);
router.patch('/packet/:id', requireRole(85), appraisalController.updateAppraisalPacket);
router.delete(
  '/packet/:id',
  requireRole(85),
  requireDestructiveOperationsEnabled('HARD_DELETE_APPRAISAL_PACKET'),
  appraisalController.deleteAppraisalPacket
);

export default router;
