import { Response, NextFunction } from 'express';
import { CommunityService } from './community.service.js';
import { AuthRequest } from '../../middleware/auth.js';

const communityService = new CommunityService();

export class CommunityController {
    async createCommunity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = { ...req.body };
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            
            if (files?.icon?.[0]) {
                data.iconUrl = (files.icon[0] as any).path;
            }
            if (files?.banner?.[0]) {
                data.bannerUrl = (files.banner[0] as any).path;
            }

            if (typeof data.isPublic === 'string') {
                data.isPublic = data.isPublic === 'true';
            }

            const server = await communityService.createCommunity(req.user!.id, data);
            res.status(201).json({ status: 'success', data: { server } });
        } catch (error) {
            next(error);
        }
    }

    async listMyCommunities(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const communities = await communityService.listMyCommunities(req.user!.id);
            res.status(200).json({ status: 'success', data: { communities } });
        } catch (error) {
            next(error);
        }
    }

    async listPublicCommunities(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { limit, cursor } = req.query;
            const communities = await communityService.listPublicCommunities(
                limit ? parseInt(limit as string) : 20,
                cursor as string
            );
            res.status(200).json({ status: 'success', data: { communities } });
        } catch (error) {
            next(error);
        }
    }

    async getCommunity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const community = await communityService.getCommunity(req.params.id as string);
            res.status(200).json({ status: 'success', data: { community } });
        } catch (error) {
            next(error);
        }
    }

    async join(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const member = await communityService.joinByInvite(req.user!.id, req.body.inviteCode, (req as any).io);
            res.status(200).json({ status: 'success', data: { member } });
        } catch (error) {
            next(error);
        }
    }

    async joinPublic(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const member = await communityService.joinPublicCommunity(req.user!.id, req.params.id as string, (req as any).io);
            res.status(200).json({ status: 'success', data: { member } });
        } catch (error) {
            next(error);
        }
    }

    async leave(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await communityService.leaveCommunity(req.user!.id, req.params.id as string);
            res.status(204).json({ status: 'success', data: null });
        } catch (error) {
            next(error);
        }
    }

    async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { limit, cursor } = req.query;
            const messages = await communityService.getChannelMessages(
                req.params.channelId as string,
                limit ? parseInt(limit as string) : 50,
                cursor as string
            );
            res.status(200).json({ status: 'success', data: { messages: messages.reverse() } });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { content, replyToId } = req.body;
            const fileUrl = (req.file as any)?.path;
            
            const message = await communityService.sendMessage(
                req.user!.id, 
                req.params.channelId as string, 
                content, 
                replyToId,
                fileUrl
            );

            // Real-time broadcast
            if ((req as any).io) {
                (req as any).io.to(`community:${req.params.id}`).emit('community:message', {
                    channelId: req.params.channelId,
                    message
                });
            }

            res.status(201).json({ status: 'success', data: { message } });
        } catch (error) {
            next(error);
        }
    }

    async toggleMessagePin(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const message = await communityService.toggleMessagePin(
                req.user!.id,
                req.params.id as string,
                req.params.messageId as string
            );
            res.status(200).json({ status: 'success', data: { message } });
        } catch (error) {
            next(error);
        }
    }

    async getPinnedMessages(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const messages = await communityService.getPinnedMessages(req.params.channelId as string);
            res.status(200).json({ status: 'success', data: { messages } });
        } catch (error) {
            next(error);
        }
    }

    // ─── Member Management ──────────────────────────────────────────

    async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const members = await communityService.getMembers(req.params.id as string);
            res.status(200).json({ status: 'success', data: { members } });
        } catch (error) {
            next(error);
        }
    }

    async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const member = await communityService.updateMemberRole(
                req.user!.id,
                req.params.id as string,
                req.params.memberId as string,
                req.body.role
            );
            res.status(200).json({ status: 'success', data: { member } });
        } catch (error) {
            next(error);
        }
    }

    async kickMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await communityService.kickMember(
                req.user!.id,
                req.params.id as string,
                req.params.memberId as string
            );
            res.status(204).json({ status: 'success', data: null });
        } catch (error) {
            next(error);
        }
    }

    // ─── Channel Management ─────────────────────────────────────────

    async createChannel(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const channel = await communityService.createChannel(
                req.user!.id,
                req.params.id as string,
                req.body
            );
            res.status(201).json({ status: 'success', data: { channel } });
        } catch (error) {
            next(error);
        }
    }

    async updateChannel(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            console.log('CommunityController.updateChannel:', {
                serverId: req.params.id,
                channelId: req.params.channelId,
                body: req.body
            });
            const channel = await communityService.updateChannel(
                req.user!.id,
                req.params.id as string,
                req.params.channelId as string,
                req.body
            );
            console.log('CommunityController.updateChannel - Success:', channel.id);
            res.status(200).json({ status: 'success', data: { channel } });
        } catch (error) {
            console.error('CommunityController.updateChannel - Error:', error);
            next(error);
        }
    }

    async deleteChannel(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await communityService.deleteChannel(
                req.user!.id,
                req.params.id as string,
                req.params.channelId as string
            );
            res.status(204).json({ status: 'success', data: null });
        } catch (error) {
            next(error);
        }
    }

    // ─── Community Settings ─────────────────────────────────────────

    async updateCommunity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = { ...req.body };
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            if (files?.icon?.[0]) {
                data.iconUrl = (files.icon[0] as any).path;
            }
            if (files?.banner?.[0]) {
                data.bannerUrl = (files.banner[0] as any).path;
            }

            if (typeof data.isPublic === 'string') {
                data.isPublic = data.isPublic === 'true';
            }

            const community = await communityService.updateCommunity(
                req.user!.id,
                req.params.id as string,
                data
            );
            res.status(200).json({ status: 'success', data: { community } });
        } catch (error) {
            next(error);
        }
    }

    async deleteCommunity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await communityService.deleteCommunity(req.user!.id, req.params.id as string);
            res.status(204).json({ status: 'success', data: null });
        } catch (error) {
            next(error);
        }
    }

    // ─── Invite Suggestions ─────────────────────────────────────────

    async getInviteSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const suggestions = await communityService.getInviteSuggestions(
                req.user!.id,
                req.params.id as string
            );
            res.status(200).json({ status: 'success', data: { suggestions } });
        } catch (error) {
            next(error);
        }
    }

    // ─── Moderation ──────────────────────────────────────────────────

    async banMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { reason, expiresAt } = req.body;
            const result = await communityService.banMember(
                req.user!.id,
                req.params.id as string,
                req.params.memberId as string,
                reason,
                expiresAt ? new Date(expiresAt) : undefined
            );
            if ((req as any).io) {
                (req as any).io.to(`user:${result.userId}`).emit('community:banned', { serverId: req.params.id });
            }
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    async unbanMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await communityService.unbanMember(
                req.user!.id,
                req.params.id as string,
                req.params.userId as string
            );
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    async timeoutMember(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { reason, durationMinutes } = req.body;
            const mute = await communityService.timeoutMember(
                req.user!.id,
                req.params.id as string,
                req.params.memberId as string,
                reason,
                parseInt(durationMinutes as string)
            );
            if ((req as any).io) {
                (req as any).io.to(`user:${mute.userId}`).emit('community:timeout', {
                    serverId: req.params.id,
                    expiresAt: mute.expiresAt,
                    reason: mute.reason
                });
            }
            res.status(200).json({ status: 'success', data: { mute } });
        } catch (error) {
            next(error);
        }
    }

    async removeTimeout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = await communityService.removeTimeout(
                req.user!.id,
                req.params.id as string,
                req.params.userId as string
            );
            res.status(200).json({ status: 'success', data: result });
        } catch (error) {
            next(error);
        }
    }

    async setNickname(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { nickname } = req.body;
            const member = await communityService.setNickname(
                req.user!.id,
                req.params.id as string,
                req.params.memberId as string,
                nickname || null
            );
            res.status(200).json({ status: 'success', data: { member } });
        } catch (error) {
            next(error);
        }
    }

    async getBannedMembers(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const bans = await communityService.getBannedMembers(req.user!.id, req.params.id as string);
            res.status(200).json({ status: 'success', data: { bans } });
        } catch (error) {
            next(error);
        }
    }

    async getMuteStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const mute = await communityService.getMuteStatus(req.params.id as string, req.user!.id);
            res.status(200).json({ status: 'success', data: { mute } });
        } catch (error) {
            next(error);
        }
    }

    async regenerateInviteCode(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const server = await communityService.regenerateInviteCode(req.user!.id, req.params.id as string);
            res.status(200).json({ status: 'success', data: { inviteCode: server.inviteCode } });
        } catch (error) {
            next(error);
        }
    }

    async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const logs = await communityService.getAuditLogs(req.user!.id, req.params.id as string);
            res.status(200).json({ status: 'success', data: { logs } });
        } catch (error) {
            next(error);
        }
    }

    async updateChannelPermissions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const channel = await communityService.updateChannelPermissions(
                req.user!.id,
                req.params.id as string,
                req.params.channelId as string,
                req.body
            );
            res.status(200).json({ status: 'success', data: { channel } });
        } catch (error) {
            next(error);
        }
    }
}
