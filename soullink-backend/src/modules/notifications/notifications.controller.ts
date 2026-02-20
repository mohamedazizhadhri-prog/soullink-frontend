import { Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class NotificationsController {
    async listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { limit, cursor } = req.query;
            const notifications = await notificationsService.listNotifications(
                req.user!.id,
                limit ? parseInt(limit as string) : 50,
                cursor as string
            );
            res.status(200).json({ status: 'success', data: { notifications } });
        } catch (error) {
            next(error);
        }
    }

    async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const count = await notificationsService.getUnreadCount(req.user!.id);
            res.status(200).json({ status: 'success', data: { count } });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await notificationsService.markAsRead(req.user!.id, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Notification marked as read' });
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await notificationsService.markAllAsRead(req.user!.id);
            res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
        } catch (error) {
            next(error);
        }
    }

    async deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await notificationsService.deleteNotification(req.user!.id, req.params.id as string);
            res.status(204).json({ status: 'success', data: null });
        } catch (error) {
            next(error);
        }
    }
}

export const notificationsController = new NotificationsController();
