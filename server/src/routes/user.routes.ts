import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
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
router.get('/', requireRole(70), getAllEmployees);
router.get('/:id', getEmployee);
router.get('/:id/risk', requireRole(80), getUserRiskProfile);
router.get('/:id/risk-profile', requireRole(80), getUserRiskProfile); // alias

// Create
router.post('/', requireRole(70), createEmployee);

// Update
// Allow self-edit; require rank 70+ to edit others
router.patch('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireRole(70)(req, res, next);
}, updateEmployee);

// PUT alias for EmployeeProfile compatibility
router.put('/:id', requireRole(70), updateEmployee);

// Delete (Archive)
router.delete('/:id', requireRole(80), deleteEmployee);
router.delete('/:id/hard', requireRole(80), hardDeleteEmployee);

// Role assignment (MD only)
router.post('/assign-role', requireRole(90), assignRole);

// Avatar upload — self or admin
router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path

export default router;
