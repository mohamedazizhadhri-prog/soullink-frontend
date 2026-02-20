import { Request, Response, NextFunction } from 'express';
import { AIService } from './ai.service.js';

const aiService = new AIService();

export const chatWithNova = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { message, history } = req.body;
        const result = await aiService.generateResponse(message, history);

        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        next(error);
    }
};
