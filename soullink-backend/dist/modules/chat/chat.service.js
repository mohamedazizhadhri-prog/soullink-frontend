import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';
import { io } from '../../server.js';
import { notificationsService } from '../notifications/notifications.service.js';
export class ChatService {
    async sendDirectMessage(senderId, receiverId, content, type = 'TEXT') {
        try {
            const message = await prisma.directMessage.create({
                data: {
                    senderId,
                    receiverId,
                    content,
                    type,
                }
            });
            // Fetch sender info for real-time broadcast and notification
            const sender = await prisma.user.findUnique({
                where: { id: senderId },
                select: { id: true, displayName: true, avatarUrl: true }
            });
            // Real-time broadcast
            if (io) {
                io.to(`user:${receiverId}`).emit('dm:message', {
                    message,
                    sender
                });
            }
            // Create notification for receiver
            await notificationsService.createNotification(receiverId, {
                type: 'message',
                title: 'New Message',
                body: `${sender?.displayName || 'Someone'} sent you a message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                metadata: { senderId }
            });
            return message;
        }
        catch (error) {
            logger.error(`Failed to send DM from ${senderId} to ${receiverId}:`, error);
            throw error;
        }
    }
    async getConversation(userId, friendId, limit = 50, cursor) {
        return await prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId }
                ]
            },
            take: Math.min(limit, 100),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
        });
    }
    async markAsRead(userId, friendId) {
        return await prisma.directMessage.updateMany({
            where: {
                senderId: friendId,
                receiverId: userId,
                read: false
            },
            data: { read: true }
        });
    }
    async getUnreadDMCount(userId) {
        return await prisma.directMessage.count({
            where: { receiverId: userId, read: false }
        });
    }
    async searchMessages(userId, query, friendId, limit = 50, cursor) {
        return await prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId }
                ],
                content: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 100),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
        });
    }
}
export const chatService = new ChatService();
