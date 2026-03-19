import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { listDepartmentKPIsLegacy } from '../controllers/enterprise.controller';
import { migrateDepartmentsToTenant } from '../scripts/migrate_departments';
import {
  createKpiSheet, getMySheets, getSheetsIAssigned, getSheetById,
  updateKpiProgress, reviewKpiSheet, recallKpiSheet, deleteKpiSheet, getAllSheets,
  getDepartmentalSummary, getIndividualSummary
} from '../controllers/kpi.controller';

const router = Router();
router.use(authenticate);

// Alias for stale frontend builds (avoid 404)
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
router.get('/summary/departmental', requireRole(80), getDepartmentalSummary);
router.get('/summary/individual', requireRole(80), getIndividualSummary);
router.get('/:id', getSheetById);

export default router;
