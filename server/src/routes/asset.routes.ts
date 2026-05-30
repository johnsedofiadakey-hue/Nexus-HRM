import { Router } from 'express';
import { authenticate, authorize, authorizeMinimumRole } from '../middleware/auth.middleware';
import { validate, CreateAssetSchema, AssignAssetSchema, ReturnAssetSchema } from '../middleware/validate.middleware';
import * as assetController from '../controllers/asset.controller';

const router = Router();

router.get('/', authenticate, authorizeMinimumRole('STAFF'), assetController.getInventory);
router.post('/', authenticate, authorizeMinimumRole('DIRECTOR'), validate(CreateAssetSchema), assetController.createAsset);
router.post('/assign', authenticate, authorizeMinimumRole('DIRECTOR'), validate(AssignAssetSchema), assetController.assignAsset);
router.post('/return', authenticate, authorizeMinimumRole('DIRECTOR'), validate(ReturnAssetSchema), assetController.returnAsset);
router.delete('/:id', authenticate, authorizeMinimumRole('DIRECTOR'), assetController.deleteAsset);

export default router;
