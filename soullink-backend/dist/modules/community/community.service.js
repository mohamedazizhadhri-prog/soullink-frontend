import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import crypto from 'crypto';
export class CommunityService {
    generateInviteCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
    }
    async createCommunity(ownerId, data) {
        const inviteCode = this.generateInviteCode();
        return await prisma.$transaction(async (tx) => {
            const server = await tx.server.create({
                data: {
                    ...data,
                    ownerId,
                    inviteCode,
                    channels: {
                        create: [
                            { name: 'general', type: 'TEXT', groupName: 'Text Channels', orderIndex: 0 },
                            { name: 'announcements', type: 'TEXT', groupName: 'Information', orderIndex: 0 },
                            { name: 'lobby', type: 'VOICE', groupName: 'Voice Channels', orderIndex: 0 }
                        ]
                    },
                    members: {
                        create: {
                            userId: ownerId,
                            role: 'OWNER'
                        }
                    }
                },
                include: {
                    channels: true,
                    _count: { select: { members: true } }
                }
            });
            return server;
        });
    }
    async listMyCommunities(userId) {
        const servers = await prisma.server.findMany({
            where: {
                members: { some: { userId } }
            },
            select: {
                id: true,
                name: true,
                description: true,
                iconUrl: true,
                _count: { select: { members: true } }
            }
        });
        return servers.map(s => ({
            ...s,
            memberCount: s._count.members
        }));
    }
    async listPublicCommunities(limit = 20, cursor) {
        const servers = await prisma.server.findMany({
            where: { isPublic: true },
            select: {
                id: true,
                name: true,
                description: true,
                iconUrl: true,
                _count: { select: { members: true } }
            },
            take: Math.min(limit, 50),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
        });
        return servers.map(s => ({
            ...s,
            memberCount: s._count.members
        }));
    }
    async getCommunity(serverId) {
        const server = await prisma.server.findUnique({
            where: { id: serverId },
            include: {
                channels: { orderBy: { orderIndex: 'asc' } },
                _count: { select: { members: true } }
            }
        });
        if (!server)
            throw new AppError(404, 'Community not found');
        return server;
    }
    async joinByInvite(userId, inviteCode) {
        const server = await prisma.server.findUnique({
            where: { inviteCode }
        });
        if (!server)
            throw new AppError(404, 'Invalid invite code');
        // Check if already a member
        const existing = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId: server.id, userId } }
        });
        if (existing)
            throw new AppError(400, 'You are already a member of this community');
        return await prisma.serverMember.create({
            data: {
                serverId: server.id,
                userId,
                role: 'MEMBER'
            }
        });
    }
    async leaveCommunity(userId, serverId) {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (server?.ownerId === userId) {
            throw new AppError(400, 'Owners cannot leave the community. Transfer ownership or delete the community instead.');
        }
        return await prisma.serverMember.delete({
            where: { serverId_userId: { serverId, userId } }
        });
    }
    async getChannelMessages(channelId, limit = 50, cursor) {
        return await prisma.message.findMany({
            where: { channelId },
            take: Math.min(limit, 100),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }
    async sendMessage(userId, channelId, content) {
        // Check if user is member of the server this channel belongs to
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: { server: { select: { id: true, members: { where: { userId } } } } }
        });
        if (!channel || channel.server.members.length === 0) {
            throw new AppError(403, 'You are not authorized to send messages in this channel');
        }
        return await prisma.message.create({
            data: {
                authorId: userId,
                channelId,
                content,
                type: 'TEXT'
            },
            include: {
                author: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }
}
