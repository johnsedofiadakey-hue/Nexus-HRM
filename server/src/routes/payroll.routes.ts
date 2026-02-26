import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createRun, approveRun, voidRun, updateItem,
  getRuns, getRunDetail, getMyPayslips,
  downloadPayslipPDF, exportPayrollCSV, getYearlySummary
} from '../controllers/payroll.controller';
import { validate, PayrollRunSchema } from '../middleware/validate.middleware';

const router = Router();
router.use(authenticate);

// Employee self-service
router.get('/my-payslips', getMyPayslips);
router.get('/payslip/:runId/:employeeId/pdf', downloadPayslipPDF);

// Admin — payroll management
router.get('/summary', authorize(['MD', 'HR_ADMIN', 'IT_ADMIN']), getYearlySummary);
router.get('/', authorize(['MD', 'HR_ADMIN', 'IT_ADMIN']), getRuns);
router.post('/run', authorize(['MD', 'HR_ADMIN']), validate(PayrollRunSchema), createRun);
router.get('/:id', authorize(['MD', 'HR_ADMIN', 'IT_ADMIN']), getRunDetail);
router.post('/:id/approve', authorize(['MD']), approveRun);
router.post('/:id/void', authorize(['MD']), voidRun);
router.patch('/items/:itemId', authorize(['MD', 'HR_ADMIN']), updateItem);
router.get('/:id/export/csv', authorize(['MD', 'HR_ADMIN']), exportPayrollCSV);

export default router;
