import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { exportEmployeesCSV, exportLeaveReportCSV, exportPerformanceReportCSV, exportEmployeesPDF, exportLeavePDF, exportAppraisalPDF, exportTargetPDF } from '../controllers/export.controller';

const router = Router();
router.use(authenticate);

router.get('/employees/csv', requireRole(80), exportEmployeesCSV);
router.get('/employees/pdf', requireRole(80), exportEmployeesPDF);
router.get('/leave/csv', requireRole(80), exportLeaveReportCSV);
router.get('/leave/:id/pdf', exportLeavePDF);
router.get('/performance/csv', requireRole(80), exportPerformanceReportCSV);
router.get('/target/:id/pdf', exportTargetPDF);
router.get('/appraisal/:id/pdf', exportAppraisalPDF);

export default router;
