import { Router } from 'express';
import {
  createKpiSheet,
  getMySheets,
  getSheetById,
  updateKpiProgress,
  reviewKpiSheet
} from '../controllers/kpi.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 1. Assign Goals (Manager sets targets)
router.post('/assign', authenticate, createKpiSheet);

// 2. View My Goals (Employee views their list)
router.get('/my-sheets', authenticate, getMySheets);

// 3. Update Progress (Employee types in their results)
// We use PATCH because we are partially updating the sheet
router.patch('/update-progress', authenticate, updateKpiProgress);

// 4. Manager Review (Approve/Reject) [NEW]
router.post('/review', authenticate, reviewKpiSheet as any);

// 5. Get Specific Sheet Details (Must be last to avoid conflict with specific words)
router.get('/:id', authenticate, getSheetById);

export default router;