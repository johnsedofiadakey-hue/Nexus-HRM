import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();

router.use(authenticate);

// Initialize a new appraisal cycle (HR/MD)
router.post('/init', requireRole(80), appraisalController.initAppraisalCycle);

// Get my own appraisal history (Packets)
router.get('/my-packets', appraisalController.getMyPackets);

// Get packets where I am a reviewer
router.get('/team-packets', requireRole(60), appraisalController.getTeamPackets);

// Get packets awaiting final executive sign-off (MD/Director)
router.get('/final-sign-off-list', requireRole(85), appraisalController.getFinalVerdictList);

// Provide final executive sign-off
router.post('/final-sign-off', requireRole(85), appraisalController.finalSignOff);

// Data Integrity Purge (Ghost Cards Fix)
router.post('/purge-orphans', requireRole(85), appraisalController.purgeOrphanPackets);
router.post('/ultimate-reset', requireRole(90), appraisalController.resetAppraisalDomain);

// Performance Trend
router.get('/trend/:employeeId', appraisalController.getPerformanceTrend);

// Appraisal Cycle Management (Director+)
router.get('/cycle/:cycleId/packets', requireRole(75), appraisalController.getCyclePackets);
router.patch('/cycle/:id', requireRole(80), appraisalController.updateAppraisalCycle);
router.delete('/cycle/:id', requireRole(80), appraisalController.deleteAppraisalCycle);

// Dispute Management
router.post('/packet/:packetId/dispute', appraisalController.raiseAppraisalDispute);
router.post('/packet/:packetId/resolve', requireRole(85), appraisalController.resolveAppraisalDispute);

// Submit a review (Self or Reviewer)
router.post('/review/:packetId', appraisalController.submitAppraisalReview);

// CRUD on a specific packet
router.get('/packet/:id', appraisalController.getPacketDetail);
router.patch('/packet/:id', requireRole(85), appraisalController.updateAppraisalPacket);
router.delete('/packet/:id', requireRole(85), appraisalController.deleteAppraisalPacket);

export default router;
