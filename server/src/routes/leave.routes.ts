import { Router } from 'express';
import { applyForLeave, getMyLeaves, getPendingLeaves, processLeave } from '../controllers/leave.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Employee Actions
router.post('/apply', authenticate, applyForLeave);
router.get('/my-history', authenticate, getMyLeaves);

// Manager Actions
router.get('/pending', authenticate, getPendingLeaves);
router.post('/process', authenticate, processLeave);

export default router;