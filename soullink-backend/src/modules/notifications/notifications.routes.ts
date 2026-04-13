import { Router } from 'express';
import { notificationsController } from './notifications.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', notificationsController.listNotifications);
router.get('/unread-count', notificationsController.getUnreadCount);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);
router.delete('/:id', notificationsController.deleteNotification);

export default router;
