import { Request, Response, NextFunction } from 'express';
import { SoulGamesService } from './soulgames.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const soulGamesService = new SoulGamesService();

export class SoulGamesController {

    async getAllGames(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const games = await soulGamesService.getAllGames(req.user!.id);
            res.status(200).json({ status: 'success', data: { games } });
        } catch (error) {
            next(error);
        }
    }

    async getGameById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const game = await soulGamesService.getGameById(req.params.id, req.user!.id);
            res.status(200).json({ status: 'success', data: { game } });
        } catch (error) {
            next(error);
        }
    }

    async submitResponse(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { sceneId, choiceId, responseTimeMs, emotionalNote } = req.body;

            if (!sceneId || !choiceId || responseTimeMs === undefined) {
                return next(new AppError(400, 'sceneId, choiceId, and responseTimeMs are required'));
            }

            const response = await soulGamesService.submitResponse(
                req.user!.id,
                req.params.id,
                sceneId,
                choiceId,
                responseTimeMs,
                emotionalNote
            );

            res.status(200).json({ status: 'success', data: { response } });
        } catch (error) {
            next(error);
        }
    }

    async completeGame(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const profile = await soulGamesService.completeGame(req.user!.id, req.params.id);
            res.status(200).json({ status: 'success', data: { profile } });
        } catch (error) {
            next(error);
        }
    }

    async getPersonalityProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const profile = await soulGamesService.getPersonalityProfile(req.user!.id);
            res.status(200).json({ status: 'success', data: { profile } });
        } catch (error) {
            next(error);
        }
    }
}
