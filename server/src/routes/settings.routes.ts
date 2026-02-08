import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

// Public route for loading branding on login? 
// Or maybe require at least basic token? 
// Ideally public so login page can be branded.
router.get('/', settingsController.getSettings);

// Admin Only Update
router.put('/', authenticate, authorize(['HR_ADMIN', 'MD']), settingsController.updateSettings);

export default router;
