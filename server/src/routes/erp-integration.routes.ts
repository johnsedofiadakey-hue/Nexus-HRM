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

// Apply ERP authentication to all gateway routes in this router
// gateway.get(...), gateway.post(...) etc would go here if separated.
// But for now we just use plain routes with specific middlewares.

// GATEWAY ENDPOINTS (For SAP/Sage)
router.get('/employees.csv', authenticateErp, ErpController.exportEmployeesCsv);
router.get('/payroll.csv', authenticateErp, ErpController.exportPayrollCsv);
router.get('/leave.csv', authenticateErp, ErpController.exportLeaveCsv);

// MANAGEMENT ENDPOINTS (For Nexus Admin UI)
// These require standard user authentication and admin role (Rank 80+)
import { authenticate, requireRole } from '../middleware/auth.middleware';

router.get('/management', authenticate, requireRole(80), ErpController.listIntegrations);
router.post('/management', authenticate, requireRole(80), ErpController.createIntegration);
router.patch('/management/:id/toggle', authenticate, requireRole(80), ErpController.toggleIntegration);
router.delete('/management/:id', authenticate, requireRole(80), ErpController.deleteIntegration);

export default router;
