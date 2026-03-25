import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import * as appraisalController from '../controllers/appraisal.controller';

const router = Router();

router.use(authenticate);

// Initialize a new appraisal cycle (HR/MD)
router.post('/init', requireRole(80), appraisalController.initAppraisalCycle);

// Get specific packet detail
router.get('/packet/:packetId', appraisalController.getPacketDetail);

// Submit a review (Self or Reviewer)
router.post('/review/:packetId', appraisalController.submitAppraisalReview);

// Get my own appraisal history (Packets)
router.get('/my-packets', appraisalController.getMyPackets);

// Get packets where I am a reviewer
router.get('/team-packets', requireRole(70), appraisalController.getTeamPackets);

// Get packets awaiting final executive verdict (MD/Director)
router.get('/final-verdict-list', requireRole(80), appraisalController.getFinalVerdictList);

// Provide final executive sign-off
router.post('/final-verdict', requireRole(80), appraisalController.finalSignOff);

// Cancel/void a packet (Director+)
router.delete('/:packetId', requireRole(80), appraisalController.cancelAppraisalPacket);

// Appraisal Cycle Management (Director+)
router.get('/cycle/:cycleId/packets', requireRole(75), appraisalController.getCyclePackets);
router.patch('/cycle/:id', requireRole(80), appraisalController.updateAppraisalCycle);
router.delete('/cycle/:id', requireRole(80), appraisalController.deleteAppraisalCycle);


// Update an active packet (MD/Director)
router.patch('/packet/:id', requireRole(80), appraisalController.updateAppraisalPacket);
router.delete('/packet/:id', requireRole(80), appraisalController.deleteAppraisalPacket);

export default router;

