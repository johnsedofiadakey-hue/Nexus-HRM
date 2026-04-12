import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import {
  createEmployee, getAllEmployees, getEmployee,
  updateEmployee, deleteEmployee, hardDeleteEmployee,
  restoreEmployee,
  uploadImage, uploadSignature, getMyTeam, getSupervisors,
  assignRole, getUserRiskProfile, resetEmployeePassword
} from '../controllers/user.controller';

const router = Router();
router.use(authenticate);

// Read
router.get('/me/team', getMyTeam);
router.get('/supervisors', getSupervisors);
router.get('/', requireRole(50), getAllEmployees);
router.get('/:id', getEmployee);
router.get('/:id/risk', requireRole(80), getUserRiskProfile);
router.get('/:id/risk-profile', requireRole(80), getUserRiskProfile); // alias

// Create (HR Manager / MD only - Rank 85+)
router.post('/', requireRole(85), createEmployee);

// Update
// Allow self-edit; require rank 70+ to edit others
router.patch('/:id', (req, res, next) => {
  if ((req as any).user?.id === req.params.id) return next();
  return requireRole(70)(req, res, next);
}, updateEmployee);

// PUT alias for EmployeeProfile compatibility
router.put('/:id', requireRole(70), updateEmployee);

// Delete (Archive) - HR Manager / MD only (Rank 85+)
router.delete('/:id', requireRole(85), deleteEmployee);
router.delete('/:id/hard', requireRole(85), hardDeleteEmployee);
router.post('/:id/restore', requireRole(85), restoreEmployee);

// Role assignment (MD only)
router.post('/assign-role', requireRole(90), assignRole);

router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path
router.post('/:id/signature', uploadSignature);

// Administrative reset (IT_MANAGER or MD >= 85)
router.post('/:id/reset-password', requireRole(85), resetEmployeePassword);

export default router;
