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

// Administrative Deletion
router.delete('/:id', requireRole(85), async (req, res) => {
  const { id } = req.params;
  try {
    const prisma = require('../prisma/client').default;
    await prisma.trainingProgram.delete({ where: { id } });
    return res.json({ message: 'Training program deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete program.' });
  }
});

router.get('/export/csv', requireRole(80), exportTrainingCSV);

export default router;
