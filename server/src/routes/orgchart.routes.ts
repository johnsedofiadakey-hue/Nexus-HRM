import { Router } from 'express';
import * as orgchartController from '../controllers/orgchart.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, ReassignSupervisorSchema } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', orgchartController.getHierarchy);
router.post('/reassign', requireRole(80), validate(ReassignSupervisorSchema), orgchartController.reassignSupervisor);

export default router;
