import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { itCreateEmployee, itResetPassword, itSystemOverview, itGetUsers, itDeactivateUser } from '../controllers/itadmin.controller';

const router = Router();
router.use(authenticate, authorize(['IT_ADMIN', 'MD', 'HR_ADMIN']));

router.get('/overview', itSystemOverview);
router.get('/users', itGetUsers);
router.post('/users', itCreateEmployee);
router.post('/users/:userId/reset-password', itResetPassword);
router.patch('/users/:userId/deactivate', itDeactivateUser);

export default router;
