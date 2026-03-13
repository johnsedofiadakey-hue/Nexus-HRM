import { Router } from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.middleware';
import { getPrograms, createProgram, enroll, markComplete, getMyTraining, exportTrainingCSV } from '../controllers/training.controller';

const router = Router();
router.use(authenticate);

router.get('/my', getMyTraining);
router.get('/', getPrograms);
router.post('/enroll', enroll);
router.post('/complete', markComplete);

router.post('/', requireRole(80), createProgram);
router.get('/export/csv', requireRole(80), exportTrainingCSV);

export default router;
