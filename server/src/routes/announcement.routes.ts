
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { validate, CreateAnnouncementSchema } from '../middleware/validate.middleware';
import * as AnnouncementController from '../controllers/announcement.controller';

const router = Router();

router.post('/', authenticate, validate(CreateAnnouncementSchema), AnnouncementController.createAnnouncement);
router.get('/', authenticate, AnnouncementController.listAnnouncements);
router.delete('/:id', authenticate, requireRole(85), AnnouncementController.deleteAnnouncement);

export default router;
