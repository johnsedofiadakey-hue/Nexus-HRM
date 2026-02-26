import { Router } from 'express';
import { getEmployeeDocuments, uploadDocument, deleteDocument } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/employee/:id', getEmployeeDocuments);
router.post('/employee/:id', uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
