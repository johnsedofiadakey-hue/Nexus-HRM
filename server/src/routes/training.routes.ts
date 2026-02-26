import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getPrograms, createProgram, enroll, markComplete, getMyTraining, exportTrainingCSV } from '../controllers/training.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyTraining);
router.get('/', getPrograms);
router.post('/enroll', enroll);
router.post('/complete', markComplete);

router.post('/', authorize(['MD', 'HR_ADMIN']), createProgram);
router.get('/export/csv', authorize(['MD', 'HR_ADMIN']), exportTrainingCSV);

export default router;
