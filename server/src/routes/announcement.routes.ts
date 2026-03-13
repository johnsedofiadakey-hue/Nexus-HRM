import { Router } from 'express';
import * as announcementController from '../controllers/announcement.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', requireRole(70), announcementController.createAnnouncement); // Manager+
router.get('/', announcementController.getAnnouncements);
router.delete('/:id', requireRole(80), announcementController.deleteAnnouncement); // Director+

export default router;
