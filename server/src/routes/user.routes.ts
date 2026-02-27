import { Router } from 'express';
import { authenticate, authorize, authorizeMinimumRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  createEmployee, getAllEmployees, getEmployee,
  updateEmployee, deleteEmployee, hardDeleteEmployee,
  uploadImage, getMyTeam, getSupervisors,
  assignRole, getUserRiskProfile
} from '../controllers/user.controller';

const router = Router();
router.use(authenticate);

// Read
router.get('/me/team', getMyTeam);
router.get('/supervisors', getSupervisors);
router.get('/', authorizeMinimumRole('MANAGER'), getAllEmployees);
router.get('/:id', getEmployee);
router.get('/:id/risk', authorizeMinimumRole('DIRECTOR'), getUserRiskProfile);

// Create
router.post('/', authorizeMinimumRole('MANAGER'), createEmployee);

// Update
router.put('/:id', authorizeMinimumRole('MANAGER'), updateEmployee);
router.patch('/:id', authorizeMinimumRole('MANAGER'), updateEmployee);

// Delete (Archive)
router.delete('/:id', authorizeMinimumRole('DIRECTOR'), deleteEmployee);

// Hard Delete (Destructive)
router.delete('/:id/hard', authorizeMinimumRole('DIRECTOR'), hardDeleteEmployee);

// Role assignment (MD only)
router.post('/assign-role', authorizeMinimumRole('MD'), assignRole);

// Avatar upload — self or admin
router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path

export default router;
