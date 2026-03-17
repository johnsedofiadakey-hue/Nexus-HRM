import { Router } from 'express';
import * as competencyController from '../controllers/competency.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', competencyController.getCompetencies);
router.post('/', authorize(['MD', 'DIRECTOR', 'MANAGER']), competencyController.createCompetency);
router.put('/:id', authorize(['MD', 'DIRECTOR', 'MANAGER']), competencyController.updateCompetency);
router.delete('/:id', authorize(['MD', 'DIRECTOR']), competencyController.deleteCompetency);

export default router;
