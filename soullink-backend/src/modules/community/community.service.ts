import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { ServerRole, ChannelType } from '@prisma/client';
import crypto from 'crypto';
import { io } from '../../server.js';
import { logger } from '../../shared/utils/logger.js';

export class CommunityService {
    private generateInviteCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters
    }

    async createCommunity(ownerId: string, data: { name: string, description?: string, isPublic: boolean, iconUrl?: string, bannerUrl?: string }) {
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
                            { name: 'announcements', type: 'TEXT', groupName: 'Text Channels', orderIndex: 1 },
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

    async listMyCommunities(userId: string) {
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

    async listPublicCommunities(limit = 20, cursor?: string) {
        const servers = await prisma.server.findMany({
            where: { isPublic: true },
            select: {
                id: true,
                name: true,
                description: true,
                iconUrl: true,
                bannerUrl: true,
                isPublic: true,
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

    async getCommunity(serverId: string) {
        const server = await prisma.server.findUnique({
            where: { id: serverId },
            include: {
                channels: { orderBy: { orderIndex: 'asc' } },
                _count: { select: { members: true } }
            }
        });

        if (!server) throw new AppError(404, 'Community not found');
        return server;
    }

    async joinByInvite(userId: string, inviteCode: string, io?: any) {
        const server = await prisma.server.findUnique({
            where: { inviteCode }
        });

        if (!server) throw new AppError(404, 'Invalid invite code');

        // Check if already a member
        const existing = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId: server.id, userId } }
        });

        if (existing) throw new AppError(400, 'You are already a member of this community');

        const member = await prisma.serverMember.create({
            data: {
                serverId: server.id,
                userId,
                role: 'MEMBER'
            },
            include: {
                server: {
                    include: {
                        channels: { orderBy: { orderIndex: 'asc' } },
                        _count: { select: { members: true } }
                    }
                }
            }
        });

        if (io) {
            io.to(`user:${userId}`).emit('community:joined', { communityId: server.id });
        }

        return member;
    }

    async joinPublicCommunity(userId: string, serverId: string, io?: any) {
        const server = await prisma.server.findUnique({
            where: { id: serverId }
        });

        if (!server || !server.isPublic) {
            throw new AppError(404, 'Community not found or is private');
        }

        // Check if user is banned
        const ban = await this.getBanStatus(serverId, userId);
        if (ban) {
            throw new AppError(403, `You are banned from this community. Reason: ${ban.reason}`);
        }

        const existing = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId, userId } }
        });

        if (existing) throw new AppError(400, 'You are already a member of this community');

        const member = await prisma.serverMember.create({
            data: {
                serverId,
                userId,
                role: 'MEMBER'
            },
            include: {
                server: {
                    include: {
                        channels: { orderBy: { orderIndex: 'asc' } },
                        _count: { select: { members: true } }
                    }
                }
            }
        });

        if (io) {
            io.to(`user:${userId}`).emit('community:joined', { communityId: serverId });
        }

        return member;
    }

    async leaveCommunity(userId: string, serverId: string) {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (server?.ownerId === userId) {
            throw new AppError(400, 'Owners cannot leave the community. Transfer ownership or delete the community instead.');
        }

        return await prisma.serverMember.delete({
            where: { serverId_userId: { serverId, userId } }
        });
    }

    async getChannelMessages(channelId: string, limit: number = 50, cursor?: string) {
        const messages = await prisma.message.findMany({
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
                },
                replyTo: {
                    include: {
                        author: {
                            select: { id: true, displayName: true }
                        }
                    }
                }
            }
        });

        // Add nicknames from server members
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { serverId: true }
        });

        if (channel) {
            const members = await prisma.serverMember.findMany({
                where: {
                    serverId: channel.serverId,
                    userId: { in: messages.map(m => m.authorId) }
                },
                select: { userId: true, nickname: true }
            });

            const nicknameMap = new Map(members.map(m => [m.userId, m.nickname]));
            return messages.map(msg => ({
                ...msg,
                author: {
                    ...msg.author,
                    nickname: nicknameMap.get(msg.authorId) || null
                }
            }));
        }

        return messages;
    }

    async sendMessage(userId: string, channelId: string, content: string, replyToId?: string, fileUrl?: string) {
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: { server: true }
        });

        if (!channel) throw new AppError(404, 'Channel not found');

        // Check for membership
        const member = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId: channel.serverId, userId } }
        });
        if (!member) throw new AppError(403, 'You are not a member of this community');

        // Check for ban (unlikely if they are a member, but good for safety)
        const ban = await this.getBanStatus(channel.serverId, userId);
        if (ban) throw new AppError(403, 'You are banned from this community');

        // Check for timeout
        const mute = await this.getMuteStatus(channel.serverId, userId);
        if (mute) {
            throw new AppError(403, `You are timed out until ${mute.expiresAt.toLocaleString()}. Reason: ${mute.reason}`);
        }

        // Check for Announcement/Permission
        const actorLevel = CommunityService.ROLE_HIERARCHY[member.role] || 1;
        const minRoleLevel = CommunityService.ROLE_HIERARCHY[channel.minPostRole] || 1;

        if (channel.isAnnouncement && actorLevel < CommunityService.ROLE_HIERARCHY['ADMIN']) {
            throw new AppError(403, 'Only Admins and Owners can post in announcement channels');
        }

        if (actorLevel < minRoleLevel) {
            throw new AppError(403, `This channel requires at least ${channel.minPostRole} role to post`);
        }

        const message = await prisma.message.create({
            data: {
                channelId,
                authorId: userId,
                content: content || (fileUrl ? "[Image]" : ""),
                replyToId,
                fileUrl,
                type: fileUrl ? 'IMAGE' : 'TEXT'
            },
            include: {
                author: {
                    select: { id: true, displayName: true, avatarUrl: true, handle: true }
                },
                replyTo: {
                    include: {
                        author: { select: { displayName: true } }
                    }
                }
            }
        });

        return {
            ...message,
            author: {
                ...message.author,
                nickname: member.nickname
            }
        };
    }

    async toggleMessagePin(actorId: string, serverId: string, messageId: string) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        if (actorLevel < CommunityService.ROLE_HIERARCHY['MODERATOR']) {
            throw new AppError(403, 'You do not have permission to pin messages');
        }

        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message) throw new AppError(404, 'Message not found');

        return await prisma.message.update({
            where: { id: messageId },
            data: { isPinned: !message.isPinned }
        });
    }

    async getPinnedMessages(channelId: string) {
        return await prisma.message.findMany({
            where: { channelId, isPinned: true },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { id: true, displayName: true, avatarUrl: true }
                }
            }
        });
    }

    // ─── Channel Management ─────────────────────────────────────────

    async createChannel(actorId: string, serverId: string, data: { name: string, type: ChannelType, groupName?: string }) {
        await this.getActorMember(actorId, serverId, 'ADMIN');

        const lastChannel = await prisma.channel.findFirst({
            where: { serverId },
            orderBy: { orderIndex: 'desc' }
        });

        const channel = await prisma.channel.create({
            data: {
                ...data,
                serverId,
                orderIndex: (lastChannel?.orderIndex ?? -1) + 1,
                groupName: data.groupName || 'Text Channels'
            }
        });

        await this.createAuditLog(serverId, actorId, 'CREATE_CHANNEL', channel.id, { name: channel.name });
        return channel;
    }

    async updateChannel(actorId: string, serverId: string, channelId: string, data: { name?: string, groupName?: string, orderIndex?: number }) {
        await this.getActorMember(actorId, serverId, 'ADMIN');

        const channel = await prisma.channel.update({
            where: { id: channelId },
            data
        });

        await this.createAuditLog(serverId, actorId, 'UPDATE_CHANNEL', channelId, data);
        return channel;
    }

    async deleteChannel(actorId: string, serverId: string, channelId: string) {
        await this.getActorMember(actorId, serverId, 'ADMIN');

        const channelCount = await prisma.channel.count({ where: { serverId } });
        if (channelCount <= 1) {
            throw new AppError(400, 'Communities must have at least one channel');
        }

        await prisma.channel.delete({
            where: { id: channelId }
        });

        await this.createAuditLog(serverId, actorId, 'DELETE_CHANNEL', channelId);
    }

    // ─── Status Helpers ────────────────────────────────────────────
    
    async getBanStatus(serverId: string, userId: string) {
        const ban = await prisma.serverBan.findUnique({
            where: { serverId_userId: { serverId, userId } }
        });
        if (!ban) return null;
        if (ban.expiresAt && ban.expiresAt < new Date()) {
            await prisma.serverBan.delete({ where: { serverId_userId: { serverId, userId } } });
            return null;
        }
        return ban;
    }

    async getMuteStatus(serverId: string, userId: string) {
        const mute = await prisma.serverMute.findUnique({
            where: { serverId_userId: { serverId, userId } }
        });
        if (!mute) return null;
        if (mute.expiresAt < new Date()) {
            await prisma.serverMute.delete({ where: { serverId_userId: { serverId, userId } } });
            return null;
        }
        return mute;
    }

    // ─── Member Management ──────────────────────────────────────────

    public static ROLE_HIERARCHY: Record<string, number> = {
        OWNER: 4,
        ADMIN: 3,
        MODERATOR: 2,
        MEMBER: 1,
    };

    public async getActorMember(userId: string, serverId: string, minRole?: string) {
        const member = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId, userId } },
            include: { user: { select: { displayName: true } } }
        });
        if (!member) throw new AppError(403, 'You are not a member of this community');
        if (minRole) {
            const actorLevel = CommunityService.ROLE_HIERARCHY[member.role] || 0;
            const required = CommunityService.ROLE_HIERARCHY[minRole] || 0;
            if (actorLevel < required) {
                throw new AppError(403, `You need at least ${minRole} permission for this action`);
            }
        }
        return member;
    }

    async getMembers(serverId: string) {
        const members = await prisma.serverMember.findMany({
            where: { serverId },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        handle: true,
                        avatarUrl: true,
                        onlineStatus: true,
                    }
                }
            },
            orderBy: { joinedAt: 'asc' }
        });

        return members.map(m => ({
            id: m.id,
            role: m.role,
            nickname: m.nickname,
            joinedAt: m.joinedAt,
            user: m.user,
        }));
    }

    async updateMemberRole(actorId: string, serverId: string, memberId: string, newRole: ServerRole) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        // Only OWNER and ADMIN can manage roles
        if (actorLevel < CommunityService.ROLE_HIERARCHY['ADMIN']) {
            throw new AppError(403, 'You do not have permission to manage roles');
        }

        const target = await prisma.serverMember.findUnique({ where: { id: memberId } });
        if (!target || target.serverId !== serverId) throw new AppError(404, 'Member not found');

        const targetLevel = CommunityService.ROLE_HIERARCHY[target.role] || 0;
        const newLevel = CommunityService.ROLE_HIERARCHY[newRole] || 0;

        // Cannot change role of someone at or above your level
        if (targetLevel >= actorLevel) {
            throw new AppError(403, 'You cannot change the role of this member');
        }
        // Cannot assign a role at or above your own level
        if (newLevel >= actorLevel) {
            throw new AppError(403, 'You cannot assign a role equal to or above your own');
        }
        // Cannot change OWNER role
        if (newRole === 'OWNER') {
            throw new AppError(403, 'Ownership can only be transferred by the current owner');
        }

        return await prisma.serverMember.update({
            where: { id: memberId },
            data: { role: newRole },
            include: {
                user: {
                    select: { id: true, displayName: true, handle: true, avatarUrl: true }
                }
            }
        });
    }

    async kickMember(actorId: string, serverId: string, memberId: string) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        // MODERATOR+ can kick
        if (actorLevel < CommunityService.ROLE_HIERARCHY['MODERATOR']) {
            throw new AppError(403, 'You do not have permission to kick members');
        }

        const target = await prisma.serverMember.findUnique({ where: { id: memberId } });
        if (!target || target.serverId !== serverId) throw new AppError(404, 'Member not found');

        const targetLevel = CommunityService.ROLE_HIERARCHY[target.role] || 0;

        // Cannot kick someone at or above your level
        if (targetLevel >= actorLevel) {
            throw new AppError(403, 'You cannot kick a member with an equal or higher role');
        }

        return await prisma.serverMember.delete({ where: { id: memberId } });
    }

    async banMember(actorId: string, serverId: string, memberId: string, reason: string, expiresAt?: Date) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        if (actorLevel < CommunityService.ROLE_HIERARCHY['MODERATOR']) {
            throw new AppError(403, 'You do not have permission to ban members');
        }

        const target = await prisma.serverMember.findUnique({ where: { id: memberId } });
        if (!target || target.serverId !== serverId) throw new AppError(404, 'Member not found');

        const targetLevel = CommunityService.ROLE_HIERARCHY[target.role] || 0;
        if (targetLevel >= actorLevel) {
            throw new AppError(403, 'You cannot ban a member with an equal or higher role');
        }

        // Remove from server and create ban record atomically
        await prisma.$transaction(async (tx) => {
            await tx.serverMember.delete({ where: { id: memberId } });
            await tx.serverBan.upsert({
                where: { serverId_userId: { serverId, userId: target.userId } },
                update: { reason, bannedById: actorId, expiresAt: expiresAt || null, createdAt: new Date() },
                create: { serverId, userId: target.userId, reason, bannedById: actorId, expiresAt: expiresAt || null }
            });
        });

        return { success: true, userId: target.userId };
    }

    async unbanMember(actorId: string, serverId: string, userId: string) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        if (actorLevel < CommunityService.ROLE_HIERARCHY['MODERATOR']) {
            throw new AppError(403, 'You do not have permission to unban members');
        }

        const ban = await prisma.serverBan.findUnique({
            where: { serverId_userId: { serverId, userId } }
        });
        if (!ban) throw new AppError(404, 'This user is not banned');

        await prisma.serverBan.delete({ where: { serverId_userId: { serverId, userId } } });
        await this.createAuditLog(serverId, actorId, 'UNBAN_MEMBER', userId);
        return { success: true };
    }

    async getBannedMembers(actorId: string, serverId: string) {
        await this.getActorMember(actorId, serverId, 'MODERATOR');

        return await prisma.serverBan.findMany({
            where: { serverId },
            include: {
                user: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                bannedBy: { select: { id: true, displayName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async timeoutMember(actorId: string, serverId: string, memberId: string, reason: string, durationMinutes: number) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        if (actorLevel < CommunityService.ROLE_HIERARCHY['MODERATOR']) {
            throw new AppError(403, 'You do not have permission to timeout members');
        }

        const member = await prisma.serverMember.findUnique({
            where: { id: memberId }
        });

        if (!member) throw new AppError(404, 'Member not found');
        if (CommunityService.ROLE_HIERARCHY[member.role] >= CommunityService.ROLE_HIERARCHY[actor.role]) {
            throw new AppError(403, 'You cannot timeout a member with equal or higher role');
        }

        const expiresAt = new Date(Date.now() + durationMinutes * 60000);
        const mute = await prisma.serverMute.upsert({
            where: { serverId_userId: { serverId, userId: member.userId } },
            update: { reason, mutedById: actorId, expiresAt },
            create: { serverId, userId: member.userId, reason, mutedById: actorId, expiresAt }
        });

        await this.createAuditLog(serverId, actorId, 'TIMEOUT_MEMBER', member.userId, { reason, durationMinutes });
        return mute;
    }

    async removeTimeout(actorId: string, serverId: string, userId: string) {
        await this.getActorMember(actorId, serverId, 'MODERATOR');

        const result = await prisma.serverMute.delete({
            where: { serverId_userId: { serverId, userId } }
        });

        await this.createAuditLog(serverId, actorId, 'REMOVE_TIMEOUT', userId);
        return result;
    }

    async setNickname(actorId: string, serverId: string, memberId: string, nickname: string | null) {
        const actor = await this.getActorMember(actorId, serverId, 'ADMIN');
        const member = await prisma.serverMember.findUnique({ 
            where: { id: memberId },
            include: { user: { select: { displayName: true } } }
        });

        if (!member) throw new AppError(404, 'Member not found');
        if (member.userId !== actorId && CommunityService.ROLE_HIERARCHY[member.role] >= CommunityService.ROLE_HIERARCHY[actor.role]) {
            throw new AppError(403, 'You cannot set nickname for a member with equal or higher role');
        }

        const updated = await prisma.serverMember.update({
            where: { id: memberId },
            data: { nickname: nickname || null },
            include: {
                user: { select: { displayName: true } }
            }
        });

        // Create a system message in the server's primary channel
        try {
            const primaryChannel = await prisma.channel.findFirst({
                where: { serverId, type: 'TEXT' },
                orderBy: { orderIndex: 'asc' }
            });

            if (primaryChannel) {
                const actorName = actor.nickname || actor.user.displayName;
                const targetPrevName = member.nickname || member.user.displayName;
                const newNickname = updated.nickname;
                
                let systemContent = "";
                if (nickname) {
                    systemContent = `${actorName} changed ${targetPrevName}'s nickname to ${nickname}`;
                } else {
                    systemContent = `${actorName} removed ${targetPrevName}'s nickname`;
                }

                const systemMsg = await prisma.message.create({
                    data: {
                        channelId: primaryChannel.id,
                        content: systemContent,
                        type: 'SYSTEM',
                        authorId: actorId
                    },
                    include: {
                        author: {
                            select: { id: true, displayName: true, handle: true, avatarUrl: true }
                        }
                    }
                });

                if (io) {
                    io.to(`community:${serverId}`).emit('community:message', {
                        channelId: primaryChannel.id,
                        message: systemMsg
                    });
                }
            }
        } catch (err) {
            logger.error('Failed to create nickname change system message:', err);
        }

        await this.createAuditLog(serverId, actorId, 'SET_NICKNAME', member.userId, { nickname });
        return updated;
    }

    async updateChannelPermissions(actorId: string, serverId: string, channelId: string, data: { isAnnouncement?: boolean, minPostRole?: string }) {
        await this.getActorMember(actorId, serverId, 'ADMIN');

        const updated = await prisma.channel.update({
            where: { id: channelId, serverId },
            data: {
                isAnnouncement: data.isAnnouncement,
                minPostRole: data.minPostRole as any
            }
        });

        await this.createAuditLog(serverId, actorId, 'UPDATE_CHANNEL_PERMS', channelId, data);
        return updated;
    }

    // ─── Audit Logging ─────────────────────────────────────────────

    private async createAuditLog(serverId: string, actorId: string, action: string, targetId?: string, details?: any) {
        try {
            await prisma.auditLog.create({
                data: {
                    serverId,
                    actorId,
                    action,
                    targetId,
                    details: details ? JSON.stringify(details) : undefined
                }
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }

    async getAuditLogs(actorId: string, serverId: string) {
        await this.getActorMember(actorId, serverId, 'MODERATOR');

        return await prisma.auditLog.findMany({
            where: { serverId },
            include: {
                actor: {
                    select: { id: true, displayName: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    async regenerateInviteCode(actorId: string, serverId: string) {
        await this.getActorMember(actorId, serverId, 'ADMIN');

        const inviteCode = this.generateInviteCode();
        const server = await prisma.server.update({
            where: { id: serverId },
            data: { inviteCode }
        });

        await this.createAuditLog(serverId, actorId, 'REGENERATE_INVITE', serverId, { inviteCode });
        return server;
    }

    // ─── Community CRUD ─────────────────────────────────────────────

    async updateCommunity(actorId: string, serverId: string, data: { name?: string, description?: string, isPublic?: boolean, iconUrl?: string, bannerUrl?: string }) {
        const actor = await this.getActorMember(actorId, serverId);
        const actorLevel = CommunityService.ROLE_HIERARCHY[actor.role] || 0;

        if (actorLevel < CommunityService.ROLE_HIERARCHY['ADMIN']) {
            throw new AppError(403, 'You do not have permission to edit community settings');
        }

        return await prisma.server.update({
            where: { id: serverId },
            data,
            include: {
                channels: true,
                _count: { select: { members: true } }
            }
        });
    }

    async deleteCommunity(actorId: string, serverId: string) {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new AppError(404, 'Community not found');
        if (server.ownerId !== actorId) {
            throw new AppError(403, 'Only the owner can delete a community');
        }

        return await prisma.server.delete({ where: { id: serverId } });
    }

    // ─── Invite Suggestions ─────────────────────────────────────────

    async getInviteSuggestions(userId: string, serverId: string) {
        // Get user's accepted friends
        const friendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: userId, status: 'ACCEPTED' },
                    { receiverId: userId, status: 'ACCEPTED' }
                ]
            },
            include: {
                sender: { select: { id: true, displayName: true, handle: true, avatarUrl: true, onlineStatus: true } },
                receiver: { select: { id: true, displayName: true, handle: true, avatarUrl: true, onlineStatus: true } }
            }
        });

        const friends = friendships.map(f => f.senderId === userId ? f.receiver : f.sender);

        // Get existing members of this community
        const existingMembers = await prisma.serverMember.findMany({
            where: { serverId },
            select: { userId: true }
        });
        const memberIds = new Set(existingMembers.map(m => m.userId));

        // Filter out friends who are already members
        return friends.filter(f => !memberIds.has(f.id));
    }
}
