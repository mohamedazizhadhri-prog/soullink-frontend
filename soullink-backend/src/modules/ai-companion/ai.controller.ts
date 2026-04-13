import { Request, Response } from 'express';
import { aiService } from './ai.service.js';
import { elevenLabsService } from './elevenlabs.service.js';

export const chatWithNova = async (req: Request, res: Response) => {
    const { message, timezone } = req.body;
    const userId = (req as any).user!.id;

    try {
        const result = await aiService.generateResponse(userId, message, false, timezone);
        res.json({ status: 'success', data: result });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getChatHistory = async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    try {
        const history = await aiService.getChatHistory(userId);
        res.json({ status: 'success', data: history });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getGameComment = async (req: Request, res: Response) => {
    const { gameId, sceneId, choiceId, responseTimeMs } = req.body;
    const userId = (req as any).user!.id;

    try {
        const result = await aiService.generateGameComment(userId, gameId, sceneId, choiceId, responseTimeMs);
        res.json({ status: 'success', data: result });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const investigate = async (req: Request, res: Response) => {
    const { query } = req.body;
    const userId = (req as any).user!.id;
    try {
        const result = await aiService.generateResponse(userId, query, true); // skipSave = true
        res.json({ status: 'success', data: result });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const streamTts = async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({ status: 'error', message: 'Text is required' });
        return;
    }
    // Cap at 500 chars to keep costs low on free plan
    const truncated = text.trim().slice(0, 500);
    await elevenLabsService.streamSpeech(truncated, res);
};
