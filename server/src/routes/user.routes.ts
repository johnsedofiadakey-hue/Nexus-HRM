import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
  createEmployee, getAllEmployees, getEmployee,
  updateEmployee, deleteEmployee, hardDeleteEmployee,
  uploadImage, getMyTeam, getSupervisors,
  assignRole, getUserRiskProfile
} from '../controllers/user.controller';

const router = Router();
router.use(authenticate);

// Read
router.get('/me/team',   getMyTeam);
router.get('/supervisors', getSupervisors);
router.get('/',          authorize(['MD', 'HR_ADMIN', 'IT_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN']), getAllEmployees);
router.get('/:id',       getEmployee);
router.get('/:id/risk',  authorize(['MD', 'HR_ADMIN']), getUserRiskProfile);

// Create
router.post('/', authorize(['MD', 'HR_ADMIN', 'IT_ADMIN']), createEmployee);

// Update
router.put('/:id',   authorize(['MD', 'HR_ADMIN', 'IT_ADMIN']), updateEmployee);
router.patch('/:id', authorize(['MD', 'HR_ADMIN', 'IT_ADMIN']), updateEmployee);

// Delete (Archive)
router.delete('/:id', authorize(['MD', 'HR_ADMIN']), deleteEmployee);

// Hard Delete (Destructive)
router.delete('/:id/hard', authorize(['MD', 'HR_ADMIN']), hardDeleteEmployee);

// Role assignment (MD only)
router.post('/assign-role', authorize(['MD']), assignRole);

// Avatar upload — self or admin
router.post('/:id/upload-image', upload.single('avatar'), uploadImage);
router.post('/:id/avatar', uploadImage); // base64 path

export default router;
