import { Response, NextFunction } from 'express';
import { CommunityService } from './community.service.js';
import { AuthRequest } from '../../middleware/auth.js';

const communityService = new CommunityService();

export class CommunityController {
    async createCommunity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const server = await communityService.createCommunity(req.user!.id, req.body);
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
            const member = await communityService.joinByInvite(req.user!.id, req.body.inviteCode);
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
            res.status(200).json({ status: 'success', data: { messages } });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const message = await communityService.sendMessage(req.user!.id, req.params.channelId as string, req.body.content);

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
}
