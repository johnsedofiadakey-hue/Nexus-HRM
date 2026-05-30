import { Router } from 'express';
import { authenticate, authorizeMinimumRole } from '../middleware/auth.middleware';
import { validate, CompensationRecordSchema } from '../middleware/validate.middleware';
import { getCompensationHistory, addCompensationRecord } from '../controllers/compensation.controller';

const router = Router();

router.get('/:employeeId', authenticate, authorizeMinimumRole('DIRECTOR'), getCompensationHistory);
router.post('/:employeeId', authenticate, authorizeMinimumRole('DIRECTOR'), validate(CompensationRecordSchema), addCompensationRecord);

export default router;
