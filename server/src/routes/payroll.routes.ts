import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createRun, approveRun, voidRun, updateItem,
  getRuns, getRunDetail, getMyPayslips,
  downloadPayslipPDF, exportPayrollCSV, exportBankCSV, getYearlySummary
} from '../controllers/payroll.controller';
import { validate, PayrollRunSchema } from '../middleware/validate.middleware';

const router = Router();
router.use(authenticate);

// Employee self-service
router.get('/my-payslips', getMyPayslips);
router.get('/payslip/:runId/:employeeId/pdf', downloadPayslipPDF);

// Admin — payroll management
router.get('/summary', requireRole(80), getYearlySummary);
router.get('/', requireRole(80), getRuns);
router.post('/run', requireRole(80), validate(PayrollRunSchema), createRun);
router.get('/:id', requireRole(80), getRunDetail);
router.post('/:id/approve', requireRole(90), approveRun);
router.post('/:id/void', requireRole(90), voidRun);
router.patch('/items/:itemId', requireRole(80), updateItem);
router.get('/:id/export/csv', requireRole(80), exportPayrollCSV);
router.get('/:id/bank-export/csv', requireRole(80), exportBankCSV);

export default router;
