import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { exportTargetPdf, exportAppraisalPdf, exportLeavePdf } from '../controllers/export.controller';

const router = Router();

router.use(authenticate);

router.get('/target/:id', exportTargetPdf);
router.get('/appraisal/:id', exportAppraisalPdf);
router.get('/leave/:id', exportLeavePdf);

export default router;
