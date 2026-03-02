import { Response, NextFunction } from 'express';
import { FriendsService } from './friends.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { notificationsService } from '../notifications/notifications.service.js';

const friendsService = new FriendsService();

export class FriendsController {
    async listFriends(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { limit, cursor } = req.query;
            const friends = await friendsService.listFriends(
                req.user!.id,
                limit ? parseInt(limit as string) : 50,
                cursor as string
            );
            res.status(200).json({ status: 'success', data: { friends } });
        } catch (error) {
            next(error);
        }
    }

    async listPendingRequests(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { limit, cursor } = req.query;
            const requests = await friendsService.listPendingRequests(
                req.user!.id,
                limit ? parseInt(limit as string) : 50,
                cursor as string
            );
            res.status(200).json({ status: 'success', data: { requests } });
        } catch (error) {
            next(error);
        }
    }

    async listSentRequests(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { limit, cursor } = req.query;
            const requests = await friendsService.listSentRequests(
                req.user!.id,
                limit ? parseInt(limit as string) : 50,
                cursor as string
            );
            res.status(200).json({ status: 'success', data: { requests } });
        } catch (error) {
            next(error);
        }
    }

    async sendRequest(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { receiverId } = req.body;
            const friendship = await friendsService.sendRequest(req.user!.id, receiverId);

            if ((req as any).io) {
                (req as any).io.to(`user:${receiverId}`).emit('friend:request', {
                    friendship,
                    sender: {
                        id: req.user!.id,
                        displayName: (req.user as any).displayName,
                        avatarUrl: (req.user as any).avatarUrl
                    }
                });
            }

            await notificationsService.createNotification(receiverId, {
                type: 'request',
                title: 'New Friend Request',
                body: `${(req.user as any).displayName} sent you a friend request.`,
                metadata: { senderId: req.user!.id }
            });

            res.status(201).json({ status: 'success', data: { friendship } });
        } catch (error) {
            next(error);
        }
    }

    async respondRequest(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { action } = req.body;
            const friendship = await friendsService.respondRequest(req.user!.id, req.params.id as string, action);

            if (action === 'accept' && (req as any).io) {
                (req as any).io.to(`user:${friendship.senderId}`).emit('friend:accepted', {
                    friendship,
                    receiver: {
                        id: req.user!.id,
                        displayName: (req.user as any).displayName,
                        avatarUrl: (req.user as any).avatarUrl
                    }
                });
            }

            if (action === 'accept') {
                await notificationsService.createNotification(friendship.senderId, {
                    type: 'request_accepted',
                    title: 'Friend Request Accepted',
                    body: `${(req.user as any).displayName} accepted your friend request.`,
                    metadata: { receiverId: req.user!.id }
                });
            }

            res.status(200).json({ status: 'success', data: { friendship } });
        } catch (error) {
            next(error);
        }
    }

    async removeFriend(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            await friendsService.removeFriend(req.user!.id, req.params.id as string);
            res.status(204).json({ status: 'success', data: null });
        } catch (error) {
            next(error);
        }
    }
}
