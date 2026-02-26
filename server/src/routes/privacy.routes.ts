import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { exportMyData, anonymiseEmployee, getDataRetentionReport } from '../controllers/privacy.controller';

const router = Router();
router.use(authenticate);

// Any employee can export their own data
router.get('/my-data-export', exportMyData);

// Admin only
router.post('/anonymise/:employeeId', authorize(['MD', 'HR_ADMIN']), anonymiseEmployee);
router.get('/retention-report', authorize(['MD', 'HR_ADMIN']), getDataRetentionReport);

export default router;
