import { Response, NextFunction } from 'express';
import { chatService } from './chat.service.js';
import { AuthRequest } from '../../middleware/auth.js';

export class ChatController {
    async getConversation(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { friendId } = req.params;
            const { limit, cursor } = req.query;
            const messages = await chatService.getConversation(
                req.user!.id,
                friendId as string,
                limit ? parseInt(limit as string) : 50,
                cursor as string
            );
            // Reverse so they are in chronological order for the frontend
            res.status(200).json({ status: 'success', data: { messages: messages.reverse() } });
        } catch (error) {
            next(error);
        }
    }

    async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { friendId } = req.params;
            const { content, type } = req.body;
            const message = await chatService.sendDirectMessage(req.user!.id, friendId as string, content, type);
            res.status(201).json({ status: 'success', data: { message } });
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { friendId } = req.params;
            await chatService.markAsRead(req.user!.id, friendId as string);
            res.status(200).json({ status: 'success', message: 'Conversation marked as read' });
        } catch (error) {
            next(error);
        }
    }

    async uploadFile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) throw new Error('File is required');
            const fileUrl = (req.file as any).path;
            res.status(200).json({ status: 'success', data: { url: fileUrl } });
        } catch (error) {
            next(error);
        }
    }

    async searchMessages(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { query, friendId } = req.query;
            const messages = await chatService.searchMessages(req.user!.id, query as string, friendId as string);
            res.status(200).json({ status: 'success', data: { messages } });
        } catch (error) {
            next(error);
        }
    }
}

export const chatController = new ChatController();
