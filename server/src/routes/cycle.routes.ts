import { Router } from 'express';
// Assuming authMiddleware exists and is exported from a middleware file
import { authenticate, authorize } from '../middleware/auth.middleware'; // Checking existence in next steps, assuming standard naming
import * as cycleController from '../controllers/cycle.controller';

const router = Router();

// Protect all routes - only Admin/HR should manage cycles usually
// Read access might be open to all authenticated users for dropdowns etc.

router.get('/', authenticate, cycleController.getAll);
router.get('/:id', authenticate, cycleController.getOne);

router.post('/', authenticate, authorize(['HR_ADMIN', 'MD']), cycleController.create);
router.put('/:id', authenticate, authorize(['HR_ADMIN', 'MD']), cycleController.update);
router.delete('/:id', authenticate, authorize(['HR_ADMIN', 'MD']), cycleController.remove);

export default router;
