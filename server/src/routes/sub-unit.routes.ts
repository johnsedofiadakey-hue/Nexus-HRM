import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { 
  getSubUnits, 
  createSubUnit, 
  updateSubUnit, 
  deleteSubUnit 
} from '../controllers/sub-unit.controller';

const router = Router();

router.use(authenticate);

router.get('/', getSubUnits);
router.post('/', createSubUnit);
router.patch('/:id', updateSubUnit);
router.delete('/:id', deleteSubUnit);

export default router;
