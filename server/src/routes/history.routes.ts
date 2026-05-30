import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { validate, CreateHistoryRecordSchema, UpdateHistoryStatusSchema } from '../middleware/validate.middleware';
import * as historyController from '../controllers/history.controller';

const router = Router();

router.post('/', authenticate, requireRole(70), validate(CreateHistoryRecordSchema), historyController.createRecord);

// Get Records: Admin can see all? Or specific employee?
// Route: /api/history/:employeeId
router.get('/:employeeId', authenticate, historyController.getEmployeeRecords); // Add logic to ensure only authorized people can view

// Update Status (e.g. resolve query)
router.put('/:id/status', authenticate, requireRole(80), validate(UpdateHistoryStatusSchema), historyController.updateStatus);

export default router;
