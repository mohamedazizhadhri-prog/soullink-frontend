import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { FriendshipStatus } from '@prisma/client';

export class FriendsService {
    async sendRequest(senderId: string, receiverId: string) {
        if (senderId === receiverId) {
            throw new AppError(400, 'You cannot send a friend request to yourself');
        }

        // Check if user exists
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId }
        });

        if (!receiver) throw new AppError(404, 'User not found');

        // Check for existing friendship/request in either direction
        const existing = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        });

        if (existing) {
            if (existing.status === 'ACCEPTED') throw new AppError(400, 'You are already friends');
            if (existing.status === 'PENDING') throw new AppError(400, 'A friend request is already pending');
            if (existing.status === 'BLOCKED') throw new AppError(400, 'This user is blocked');
        }

        return await prisma.friendship.create({
            data: {
                senderId,
                receiverId,
                status: 'PENDING'
            }
        });
    }

    async respondRequest(userId: string, friendshipId: string, action: 'accept' | 'decline') {
        const friendship = await prisma.friendship.findUnique({
            where: { id: friendshipId }
        });

        if (!friendship || friendship.receiverId !== userId || friendship.status !== 'PENDING') {
            throw new AppError(404, 'Friend request not found');
        }

        if (action === 'accept') {
            return await prisma.friendship.update({
                where: { id: friendshipId },
                data: { status: 'ACCEPTED' }
            });
        } else {
            return await prisma.friendship.delete({
                where: { id: friendshipId }
            });
        }
    }

    async removeFriend(userId: string, friendshipId: string) {
        const friendship = await prisma.friendship.findUnique({
            where: { id: friendshipId }
        });

        if (!friendship || (friendship.senderId !== userId && friendship.receiverId !== userId)) {
            throw new AppError(404, 'Friendship not found');
        }

        return await prisma.friendship.delete({
            where: { id: friendshipId }
        });
    }

    async listFriends(userId: string) {
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'ACCEPTED' },
                    { receiverId: userId, status: 'ACCEPTED' }
                ]
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true,
                        onlineStatus: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true,
                        onlineStatus: true
                    }
                }
            }
        });

        return friendships.map(f => {
            const friend = f.senderId === userId ? f.receiver : f.sender;
            return {
                id: friend.id,
                friendshipId: f.id,
                displayName: friend.displayName,
                handle: friend.handle,
                avatarUrl: friend.avatarUrl,
                status: friend.onlineStatus
            };
        });
    }

    async listPendingRequests(userId: string) {
        const requests = await prisma.friendship.findMany({
            where: {
                receiverId: userId,
                status: 'PENDING'
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return requests.map(r => ({
            id: r.id,
            sender: r.sender,
            createdAt: r.createdAt
        }));
    }

    async listSentRequests(userId: string) {
        const requests = await prisma.friendship.findMany({
            where: {
                senderId: userId,
                status: 'PENDING'
            },
            include: {
                receiver: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return requests.map(r => ({
            id: r.id,
            receiver: r.receiver,
            createdAt: r.createdAt
        }));
    }
}
