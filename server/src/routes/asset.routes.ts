import { Router } from 'express';
import { authenticate, authorize, authorizeMinimumRole } from '../middleware/auth.middleware';
import * as assetController from '../controllers/asset.controller';

const router = Router();

// Get Inventory (Admin/IT/Supervisor)
router.get('/', authenticate, authorizeMinimumRole('MID_MANAGER'), assetController.getInventory);

// Create Asset (Admin/MD)
router.post('/', authenticate, authorizeMinimumRole('MANAGER'), assetController.createAsset);

// Assign Asset (Admin/MD/Supervisor)
router.post('/assign', authenticate, authorizeMinimumRole('MID_MANAGER'), assetController.assignAsset);

// Return Asset (Admin/MD/Supervisor)
router.post('/return', authenticate, authorizeMinimumRole('MID_MANAGER'), assetController.returnAsset);

export default router;
