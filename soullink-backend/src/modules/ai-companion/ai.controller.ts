import { Response, NextFunction } from 'express';
import { AIService } from './ai.service.js';
import { AuthRequest } from '../../middleware/auth.js';

const aiService = new AIService();

export const chatWithNova = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
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
    } catch (error) {
        next(error);
    }
};

export const getChatHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 50;

        const history = await aiService.getChatHistory(userId, Math.min(limit, 100));

        res.status(200).json({
            status: 'success',
            data: history,
        });
    } catch (error) {
        next(error);
    }
};

export const getGameComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { sceneText, choiceText, responseTimeMs, gameTitle } = req.body;

        if (!sceneText || !choiceText || typeof responseTimeMs !== 'number' || !gameTitle) {
            return res.status(400).json({ status: 'error', message: 'sceneText, choiceText, responseTimeMs, gameTitle are required' });
        }

        const result = await aiService.generateGameComment(userId, sceneText, choiceText, responseTimeMs, gameTitle);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
};

export const investigate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { message } = req.body;

        if (!message) return res.status(400).json({ status: 'error', message: 'Message is required' });

        const result = await aiService.generateResponse(userId, message, true); // true = skipSave

        res.status(200).json({
            status: 'success',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
