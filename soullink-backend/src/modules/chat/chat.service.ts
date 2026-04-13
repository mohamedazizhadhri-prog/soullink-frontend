import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';
import { io } from '../../server.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { MessageType } from '@prisma/client';

export class ChatService {
    async sendDirectMessage(senderId: string, receiverId: string, content: string, type: MessageType = 'TEXT', replyToId?: string, fileUrl?: string) {
        try {
            const message = await prisma.directMessage.create({
                data: {
                    senderId,
                    receiverId,
                    content,
                    type,
                    replyToId,
                    fileUrl
                },
                include: {
                    replyTo: {
                        include: {
                            sender: { select: { id: true, displayName: true } }
                        }
                    }
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
        } catch (error) {
            logger.error(`Failed to send DM from ${senderId} to ${receiverId}:`, error);
            throw error;
        }
    }

    async getConversation(userId: string, friendId: string, limit = 50, cursor?: string) {
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
            include: {
                replyTo: {
                    include: {
                        sender: { select: { id: true, displayName: true } }
                    }
                }
            }
        });
    }

    async togglePin(userId: string, friendId: string, messageId: string) {
        const message = await prisma.directMessage.findUnique({ where: { id: messageId } });
        if (!message) throw new Error('Message not found');

        // Verify user is part of the conversation
        if (message.senderId !== userId && message.receiverId !== userId) {
            throw new Error('Unauthorized');
        }

        const updatedMessage = await prisma.directMessage.update({
            where: { id: messageId },
            data: { isPinned: !message.isPinned }
        });

        // Broadcast pin toggle
        if (io) {
            const targetId = message.senderId === userId ? message.receiverId : message.senderId;
            // Emit to both users involved
            io.to(`user:${userId}`).emit('dm:pin', updatedMessage);
            io.to(`user:${targetId}`).emit('dm:pin', updatedMessage);
        }

        return updatedMessage;
    }

    async getPinnedMessages(userId: string, friendId: string) {
        return await prisma.directMessage.findMany({
            where: {
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId }
                ],
                isPinned: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async markAsRead(userId: string, friendId: string) {
        return await prisma.directMessage.updateMany({
            where: {
                senderId: friendId,
                receiverId: userId,
                read: false
            },
            data: { read: true }
        });
    }

    async getUnreadDMCount(userId: string) {
        return await prisma.directMessage.count({
            where: { receiverId: userId, read: false }
        });
    }

    async searchMessages(userId: string, query: string, friendId?: string, limit = 50, cursor?: string) {
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
