import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';
import { io } from '../../server.js';
export class NotificationsService {
    async createNotification(userId, data) {
        try {
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type: data.type,
                    title: data.title,
                    body: data.body,
                    metadata: data.metadata || {},
                }
            });
            // Real-time broadcast
            if (io) {
                io.to(`user:${userId}`).emit('notification:new', notification);
            }
            return notification;
        }
        catch (error) {
            logger.error(`Failed to create notification for user ${userId}:`, error);
            throw error;
        }
    }
    async listNotifications(userId, limit = 50, cursor) {
        return await prisma.notification.findMany({
            where: { userId },
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }
    async getUnreadCount(userId) {
        return await prisma.notification.count({
            where: { userId, read: false },
        });
    }
    async markAsRead(userId, notificationId) {
        return await prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { read: true },
        });
    }
    async markAllAsRead(userId) {
        return await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }
    async deleteNotification(userId, notificationId) {
        return await prisma.notification.deleteMany({
            where: { id: notificationId, userId },
        });
    }
}
export const notificationsService = new NotificationsService();
