import { CommunityService } from './community.service.js';
const communityService = new CommunityService();
export class CommunityController {
    async createCommunity(req, res, next) {
        try {
            const server = await communityService.createCommunity(req.user.id, req.body);
            res.status(201).json({ status: 'success', data: { server } });
        }
        catch (error) {
            next(error);
        }
    }
    async listMyCommunities(req, res, next) {
        try {
            const communities = await communityService.listMyCommunities(req.user.id);
            res.status(200).json({ status: 'success', data: { communities } });
        }
        catch (error) {
            next(error);
        }
    }
    async listPublicCommunities(req, res, next) {
        try {
            const { limit, cursor } = req.query;
            const communities = await communityService.listPublicCommunities(limit ? parseInt(limit) : 20, cursor);
            res.status(200).json({ status: 'success', data: { communities } });
        }
        catch (error) {
            next(error);
        }
    }
    async getCommunity(req, res, next) {
        try {
            const community = await communityService.getCommunity(req.params.id);
            res.status(200).json({ status: 'success', data: { community } });
        }
        catch (error) {
            next(error);
        }
    }
    async join(req, res, next) {
        try {
            const member = await communityService.joinByInvite(req.user.id, req.body.inviteCode);
            res.status(200).json({ status: 'success', data: { member } });
        }
        catch (error) {
            next(error);
        }
    }
    async leave(req, res, next) {
        try {
            await communityService.leaveCommunity(req.user.id, req.params.id);
            res.status(204).json({ status: 'success', data: null });
        }
        catch (error) {
            next(error);
        }
    }
    async getMessages(req, res, next) {
        try {
            const { limit, cursor } = req.query;
            const messages = await communityService.getChannelMessages(req.params.channelId, limit ? parseInt(limit) : 50, cursor);
            res.status(200).json({ status: 'success', data: { messages } });
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const message = await communityService.sendMessage(req.user.id, req.params.channelId, req.body.content);
            // Real-time broadcast
            if (req.io) {
                req.io.to(`community:${req.params.id}`).emit('community:message', {
                    channelId: req.params.channelId,
                    message
                });
            }
            res.status(201).json({ status: 'success', data: { message } });
        }
        catch (error) {
            next(error);
        }
    }
}
