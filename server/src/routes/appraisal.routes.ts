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

export default router;

