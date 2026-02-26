import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getOrgChart } from '../controllers/orgchart.controller';

const router = Router();
router.get('/', authenticate, getOrgChart);
export default router;
