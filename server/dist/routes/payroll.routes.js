"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payroll_controller_1 = require("../controllers/payroll.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Employee self-service
router.get('/my-payslips', payroll_controller_1.getMyPayslips);
router.get('/payslip/:runId/:employeeId/pdf', payroll_controller_1.downloadPayslipPDF);
// Admin — payroll management
router.get('/summary', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.getYearlySummary);
router.get('/', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.getRuns);
router.post('/run', (0, auth_middleware_1.requireRole)(85), (0, validate_middleware_1.validate)(validate_middleware_1.PayrollRunSchema), payroll_controller_1.createRun);
router.get('/:id', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.getRunDetail);
router.post('/:id/approve', (0, auth_middleware_1.requireRole)(90), payroll_controller_1.approveRun);
router.post('/:id/void', (0, auth_middleware_1.requireRole)(90), payroll_controller_1.voidRun);
router.delete('/:id', (0, auth_middleware_1.requireRole)(90), payroll_controller_1.deleteRun);
router.patch('/items/:itemId', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.updateItem);
router.get('/:id/export/csv', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.exportPayrollCSV);
router.get('/:id/bank-export/csv', (0, auth_middleware_1.requireRole)(85), payroll_controller_1.exportBankCSV);
exports.default = router;
