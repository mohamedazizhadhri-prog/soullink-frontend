import { notificationsService } from './notifications.service.js';
export class NotificationsController {
    async listNotifications(req, res, next) {
        try {
            const { limit, cursor } = req.query;
            const notifications = await notificationsService.listNotifications(req.user.id, limit ? parseInt(limit) : 50, cursor);
            res.status(200).json({ status: 'success', data: { notifications } });
        }
        catch (error) {
            next(error);
        }
    }
    async getUnreadCount(req, res, next) {
        try {
            const count = await notificationsService.getUnreadCount(req.user.id);
            res.status(200).json({ status: 'success', data: { count } });
        }
        catch (error) {
            next(error);
        }
    }
    async markAsRead(req, res, next) {
        try {
            await notificationsService.markAsRead(req.user.id, req.params.id);
            res.status(200).json({ status: 'success', message: 'Notification marked as read' });
        }
        catch (error) {
            next(error);
        }
    }
    async markAllAsRead(req, res, next) {
        try {
            await notificationsService.markAllAsRead(req.user.id);
            res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteNotification(req, res, next) {
        try {
            await notificationsService.deleteNotification(req.user.id, req.params.id);
            res.status(204).json({ status: 'success', data: null });
        }
        catch (error) {
            next(error);
        }
    }
}
export const notificationsController = new NotificationsController();
