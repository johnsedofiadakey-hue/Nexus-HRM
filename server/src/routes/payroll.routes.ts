import { Router } from 'express';
import { authenticate, authorize, authorizeMinimumRole } from '../middleware/auth.middleware';
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
router.get('/summary', authorizeMinimumRole('MANAGER'), getYearlySummary);
router.get('/', authorizeMinimumRole('MANAGER'), getRuns);
router.post('/run', authorizeMinimumRole('MANAGER'), validate(PayrollRunSchema), createRun);
router.get('/:id', authorizeMinimumRole('MANAGER'), getRunDetail);
router.post('/:id/approve', authorizeMinimumRole('MD'), approveRun);
router.post('/:id/void', authorizeMinimumRole('MD'), voidRun);
router.patch('/items/:itemId', authorizeMinimumRole('MANAGER'), updateItem);
router.get('/:id/export/csv', authorizeMinimumRole('MANAGER'), exportPayrollCSV);

export default router;
