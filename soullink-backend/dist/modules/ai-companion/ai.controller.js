import { AIService } from './ai.service.js';
const aiService = new AIService();
export const chatWithNova = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { message } = req.body;
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Message is required',
            });
        }
        const result = await aiService.generateResponse(userId, message.trim());
        res.status(200).json({
            status: 'success',
            data: result,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getChatHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const history = await aiService.getChatHistory(userId, Math.min(limit, 100));
        res.status(200).json({
            status: 'success',
            data: history,
        });
    }
    catch (error) {
        next(error);
    }
};
