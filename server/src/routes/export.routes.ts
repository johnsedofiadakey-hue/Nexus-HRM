import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { exportEmployeesCSV, exportLeaveReportCSV, exportPerformanceReportCSV, exportEmployeesPDF } from '../controllers/export.controller';

const router = Router();
router.use(authenticate, authorize(['MD', 'HR_ADMIN']));

router.get('/employees/csv', exportEmployeesCSV);
router.get('/employees/pdf', exportEmployeesPDF);
router.get('/leave/csv', exportLeaveReportCSV);
router.get('/performance/csv', exportPerformanceReportCSV);

export default router;
