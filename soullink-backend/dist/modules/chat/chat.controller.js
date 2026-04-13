import { chatService } from './chat.service.js';
export class ChatController {
    async getConversation(req, res, next) {
        try {
            const { friendId } = req.params;
            const { limit, cursor } = req.query;
            const messages = await chatService.getConversation(req.user.id, friendId, limit ? parseInt(limit) : 50, cursor);
            // Reverse so they are in chronological order for the frontend
            res.status(200).json({ status: 'success', data: { messages: messages.reverse() } });
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const { friendId } = req.params;
            const { content, type } = req.body;
            const message = await chatService.sendDirectMessage(req.user.id, friendId, content, type);
            res.status(201).json({ status: 'success', data: { message } });
        }
        catch (error) {
            next(error);
        }
    }
    async markAsRead(req, res, next) {
        try {
            const { friendId } = req.params;
            await chatService.markAsRead(req.user.id, friendId);
            res.status(200).json({ status: 'success', message: 'Conversation marked as read' });
        }
        catch (error) {
            next(error);
        }
    }
    async uploadFile(req, res, next) {
        try {
            if (!req.file)
                throw new Error('File is required');
            const fileUrl = req.file.path;
            res.status(200).json({ status: 'success', data: { url: fileUrl } });
        }
        catch (error) {
            next(error);
        }
    }
    async searchMessages(req, res, next) {
        try {
            const { query, friendId } = req.query;
            const messages = await chatService.searchMessages(req.user.id, query, friendId);
            res.status(200).json({ status: 'success', data: { messages } });
        }
        catch (error) {
            next(error);
        }
    }
}
export const chatController = new ChatController();
