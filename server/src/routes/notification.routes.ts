import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMyNotifications, markRead, getUnreadCount } from '../controllers/notification.controller';

const router = Router();
router.use(authenticate);
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/mark-read', markRead);
export default router;
