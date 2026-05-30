import { Router } from 'express';
import { getEmployeeQueries, createQuery, updateQueryStatus } from '../controllers/query.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, CreateQuerySchema, UpdateQueryStatusSchema } from '../middleware/validate.middleware';

const router = Router();
router.use(authenticate);

router.get('/employee/:id', getEmployeeQueries);
router.post('/employee/:id', validate(CreateQuerySchema), createQuery);
router.patch('/:id/status', validate(UpdateQueryStatusSchema), updateQueryStatus);

export default router;
