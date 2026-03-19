import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { listDepartmentKPIs, listDepartmentKPIsLegacy } from '../controllers/enterprise.controller';
import { migrateDepartmentsToTenant } from '../scripts/migrate_departments';
import {
  createKpiSheet, getMySheets, getSheetsIAssigned, getSheetById,
  updateKpiProgress, reviewKpiSheet, recallKpiSheet, deleteKpiSheet, getAllSheets
} from '../controllers/kpi.controller';

const router = Router();
router.use(authenticate);

// Standardized KPI routes (Part 1)
router.get('/department', requireRole(70), listDepartmentKPIs);

// Legacy alias for stale frontend builds (avoid 404)
router.get('/department-list', requireRole(70), listDepartmentKPIsLegacy);
router.post('/repair-tenants', requireRole(80), migrateDepartmentsToTenant);

// Employee
router.get('/my-sheets', getMySheets);
router.patch('/update-progress', updateKpiProgress);
router.post('/recall', recallKpiSheet);

// Manager / MD / Supervisor
router.get('/assigned', getSheetsIAssigned);
router.post('/assign', requireRole(70), createKpiSheet);
router.post('/review', requireRole(70), reviewKpiSheet);

// MD / HR Admin
router.get('/all', requireRole(80), getAllSheets);
router.delete('/:id', requireRole(80), deleteKpiSheet);
router.get('/:id', getSheetById);

export default router;
