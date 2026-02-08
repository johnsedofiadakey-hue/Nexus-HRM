import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as assetController from '../controllers/asset.controller';

const router = Router();

// Get Inventory (Admin/IT/Supervisor)
router.get('/', authenticate, authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), assetController.getInventory);

// Create Asset (Admin/MD)
router.post('/', authenticate, authorize(['HR_ADMIN', 'MD']), assetController.createAsset);

// Assign Asset (Admin/MD/Supervisor)
router.post('/assign', authenticate, authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), assetController.assignAsset);

// Return Asset (Admin/MD/Supervisor)
router.post('/return', authenticate, authorize(['HR_ADMIN', 'MD', 'SUPERVISOR']), assetController.returnAsset);

export default router;
