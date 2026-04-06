import { Router } from 'express';
import { authenticate, authorize, authorizeMinimumRole } from '../middleware/auth.middleware';
import * as assetController from '../controllers/asset.controller';

const router = Router();

// Get Inventory (All Staff)
router.get('/', authenticate, authorizeMinimumRole('STAFF'), assetController.getInventory);

// Create Asset (Admin/MD/Director)
router.post('/', authenticate, authorizeMinimumRole('DIRECTOR'), assetController.createAsset);

// Assign Asset (Admin/MD/Director)
router.post('/assign', authenticate, authorizeMinimumRole('DIRECTOR'), assetController.assignAsset);

// Return Asset (Admin/MD/Director)
router.post('/return', authenticate, authorizeMinimumRole('DIRECTOR'), assetController.returnAsset);

// Delete Asset (Admin/MD/Director)
router.delete('/:id', authenticate, authorizeMinimumRole('DIRECTOR'), assetController.deleteAsset);

export default router;
