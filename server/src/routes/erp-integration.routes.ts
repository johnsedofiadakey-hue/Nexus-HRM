import { Router } from 'express';
import * as ErpController from '../controllers/erp-integration.controller';
import { authenticateErp } from '../middleware/erp-auth.middleware';

const router = Router();

/**
 * ERP Integration Gateway Routes
 * These endpoints are specifically designed for external "Pull" requests 
 * from enterprise systems like SAP and Sage.
 * Authentication: Performed via X-Nexus-ERP-Key header.
 */

// Apply ERP authentication to all routes in this router
router.use(authenticateErp);

// CSV Export Endpoints
router.get('/employees.csv', ErpController.exportEmployeesCsv);
router.get('/payroll.csv', ErpController.exportPayrollCsv);
router.get('/leave.csv', ErpController.exportLeaveCsv);

export default router;
