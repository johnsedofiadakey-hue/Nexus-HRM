import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
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
router.post('/assign', authorize(['MD', 'HR_ADMIN', 'SUPERVISOR']), createKpiSheet);
router.post('/review', authorize(['MD', 'HR_ADMIN', 'SUPERVISOR']), reviewKpiSheet);

// MD / HR Admin
router.get('/all', authorize(['MD', 'HR_ADMIN']), getAllSheets);
router.delete('/:id', authorize(['MD', 'HR_ADMIN']), deleteKpiSheet);
router.get('/:id', getSheetById);

export default router;
