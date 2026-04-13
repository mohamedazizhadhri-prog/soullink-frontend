import { FriendsService } from './friends.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
const friendsService = new FriendsService();
export class FriendsController {
    async listFriends(req, res, next) {
        try {
            const { limit, cursor } = req.query;
            const friends = await friendsService.listFriends(req.user.id, limit ? parseInt(limit) : 50, cursor);
            res.status(200).json({ status: 'success', data: { friends } });
        }
        catch (error) {
            next(error);
        }
    }
    async listPendingRequests(req, res, next) {
        try {
            const { limit, cursor } = req.query;
            const requests = await friendsService.listPendingRequests(req.user.id, limit ? parseInt(limit) : 50, cursor);
            res.status(200).json({ status: 'success', data: { requests } });
        }
        catch (error) {
            next(error);
        }
    }
    async listSentRequests(req, res, next) {
        try {
            const { limit, cursor } = req.query;
            const requests = await friendsService.listSentRequests(req.user.id, limit ? parseInt(limit) : 50, cursor);
            res.status(200).json({ status: 'success', data: { requests } });
        }
        catch (error) {
            next(error);
        }
    }
    async sendRequest(req, res, next) {
        try {
            const { receiverId } = req.body;
            const friendship = await friendsService.sendRequest(req.user.id, receiverId);
            if (req.io) {
                req.io.to(`user:${receiverId}`).emit('friend:request', {
                    friendship,
                    sender: {
                        id: req.user.id,
                        displayName: req.user.displayName,
                        avatarUrl: req.user.avatarUrl
                    }
                });
            }
            await notificationsService.createNotification(receiverId, {
                type: 'request',
                title: 'New Friend Request',
                body: `${req.user.displayName} sent you a friend request.`,
                metadata: { senderId: req.user.id }
            });
            res.status(201).json({ status: 'success', data: { friendship } });
        }
        catch (error) {
            next(error);
        }
    }
    async respondRequest(req, res, next) {
        try {
            const { action } = req.body;
            const friendship = await friendsService.respondRequest(req.user.id, req.params.id, action);
            if (action === 'accept' && req.io) {
                req.io.to(`user:${friendship.senderId}`).emit('friend:accepted', {
                    friendship,
                    receiver: {
                        id: req.user.id,
                        displayName: req.user.displayName,
                        avatarUrl: req.user.avatarUrl
                    }
                });
            }
            if (action === 'accept') {
                await notificationsService.createNotification(friendship.senderId, {
                    type: 'request_accepted',
                    title: 'Friend Request Accepted',
                    body: `${req.user.displayName} accepted your friend request.`,
                    metadata: { receiverId: req.user.id }
                });
            }
            res.status(200).json({ status: 'success', data: { friendship } });
        }
        catch (error) {
            next(error);
        }
    }
    async removeFriend(req, res, next) {
        try {
            await friendsService.removeFriend(req.user.id, req.params.id);
            res.status(204).json({ status: 'success', data: null });
        }
        catch (error) {
            next(error);
        }
    }
}
