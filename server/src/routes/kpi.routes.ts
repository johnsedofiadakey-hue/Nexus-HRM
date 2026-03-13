import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import {
  createKpiSheet, getMySheets, getSheetsIAssigned, getSheetById,
  updateKpiProgress, reviewKpiSheet, recallKpiSheet, deleteKpiSheet, getAllSheets
} from '../controllers/kpi.controller';

const router = Router();
router.use(authenticate);

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
