import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  createRun, approveRun, voidRun, deleteRun, updateItem,
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
router.get('/summary', requireRole(85), getYearlySummary);
router.get('/', requireRole(85), getRuns);
router.post('/run', requireRole(85), validate(PayrollRunSchema), createRun);
router.get('/:id', requireRole(85), getRunDetail);
router.post('/:id/approve', requireRole(90), approveRun);
router.post('/:id/void', requireRole(90), voidRun);
router.delete('/:id', requireRole(90), deleteRun);
router.patch('/items/:itemId', requireRole(85), updateItem);
router.get('/:id/export/csv', requireRole(85), exportPayrollCSV);
router.get('/:id/bank-export/csv', requireRole(85), exportBankCSV);

export default router;
