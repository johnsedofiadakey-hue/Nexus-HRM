import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

// Public — branding loads on login page before auth
router.get('/', settingsController.getSettings);
router.get('/organization', settingsController.getSettings);

// Admin Only Update
router.put('/', authenticate, requireRole(80), settingsController.updateSettings);
router.patch('/organization', authenticate, requireRole(80), settingsController.updateSettings);
router.put('/organization', authenticate, requireRole(80), settingsController.updateSettings);

export default router;
