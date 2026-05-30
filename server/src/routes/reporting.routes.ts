import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, AddReportingLineSchema, UpdateReportingLineSchema } from '../middleware/validate.middleware';
import * as ctrl from '../controllers/reporting.controller';

const router = Router();
router.use(authenticate);

router.get('/employee/:employeeId', ctrl.getEmployeeReportingLines);
router.get('/my-reports', ctrl.getMyDirectReports);
router.post('/', requireRole(60), validate(AddReportingLineSchema), ctrl.addReportingLine);
router.patch('/:id', requireRole(60), validate(UpdateReportingLineSchema), ctrl.updateReportingLine);
router.delete('/:id', requireRole(60), ctrl.removeReportingLine);

export default router;
