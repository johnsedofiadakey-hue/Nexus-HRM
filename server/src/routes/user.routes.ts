import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// Dashboard/Team generic route (existing functionality pattern)
router.get('/my-team', authenticate, userController.getMyTeam);

// Employee Master Routes (Admin/HR Only mostly)
router.get('/', authenticate, authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), userController.getAllEmployees); // Supervisors might need to see list to pick? Or restricted?
router.get('/:id', authenticate, userController.getEmployee); // Individual profile viewing

router.post('/', authenticate, authorize(['HR_ADMIN', 'MD']), userController.createEmployee);
router.put('/:id', authenticate, authorize(['HR_ADMIN', 'MD']), userController.updateEmployee);
router.delete('/:id', authenticate, authorize(['HR_ADMIN', 'MD']), userController.deleteEmployee);
router.post('/:id/image', authenticate, authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), userController.uploadImage);

// Risk Profile (Admin/HR Only)
router.get('/:id/risk-profile', authenticate, authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), userController.getUserRiskProfile);

export default router;
