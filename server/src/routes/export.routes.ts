import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { exportTargetPdf, exportAppraisalPdf, exportLeavePdf, exportRoadmapPdf } from '../controllers/export.controller';

const router = Router();

router.use(authenticate);

router.get('/roadmap/pdf', exportRoadmapPdf);
router.get('/target/:id/pdf', exportTargetPdf);
router.get('/appraisal/:id/pdf', exportAppraisalPdf);
router.get('/leave/:id/pdf', exportLeavePdf);

export default router;
