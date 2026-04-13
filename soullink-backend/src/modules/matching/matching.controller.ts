import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { matchingService } from './matching.service.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { INTEREST_CATEGORIES } from './matching.constants.js';
import type { UpdatePreferenceDto, SuggestionAction } from './matching.types.js';

export class MatchingController {

    // GET /api/matching/suggestions
    async getSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const suggestions = await matchingService.getOrGenerateSuggestions(req.user!.id);
            res.status(200).json({ status: 'success', data: { suggestions } });
        } catch (err) { next(err); }
    }

    // POST /api/matching/suggestions/:candidateId/action
    // body: { action: 'like' | 'pass' }
    async actOnSuggestion(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const candidateId = String(req.params.candidateId);
            const action = req.body.action as SuggestionAction;

            if (!['like', 'pass'].includes(action)) {
                return res.status(400).json({ status: 'error', message: 'action must be "like" or "pass"' });
            }

            const result = await matchingService.actOnSuggestion(req.user!.id, candidateId, action);

            // If a match was created, send a push notification to the candidate
            if (result.matched && result.matchId) {
                const matchId = String(result.matchId);
                notificationsService.createNotification(candidateId, {
                    type: 'match_new',
                    title: '✨ You have a new Soul Match!',
                    body: 'Someone connected with you. Start your anonymous conversation now.',
                    metadata: { matchId },
                }).catch(() => {}); // fire-and-forget
            }

            res.status(200).json({ status: 'success', data: result });
        } catch (err) { next(err); }
    }

    // GET /api/matching/matches
    async getActiveMatches(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const matches = await matchingService.getActiveMatches(req.user!.id);
            res.status(200).json({ status: 'success', data: { matches } });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/matching/queue
    async joinQueue(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const match = await matchingService.joinQueue(req.user!.id, req.body);
            res.status(200).json({ status: 'success', data: { match } });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/matching/matches/:matchId/reveal
    async revealIdentity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { matchId } = req.params;
            const result = await matchingService.revealIdentity(req.user!.id, matchId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/matching/matches/:matchId
    async terminateMatch(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { matchId } = req.params;
            const result = await matchingService.terminateMatch(req.user!.id, matchId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/matching/matches/:matchId/messages
    async getMatchMessages(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { matchId } = req.params;
            const messages = await matchingService.getMatchMessages(req.user!.id, matchId);
            res.status(200).json({ status: 'success', data: { messages } });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/matching/matches/:matchId/messages
    async sendMatchMessage(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { matchId } = req.params;
            const { content } = req.body;
            const message = await matchingService.sendMatchMessage(req.user!.id, matchId, content);
            res.status(200).json({ status: 'success', data: { message } });
        } catch (error) {
            next(error);
        }
    }


    // GET /api/matching/preference
    async getPreference(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const pref = await matchingService.getOrCreatePreference(req.user!.id);
            res.status(200).json({ status: 'success', data: { preference: pref } });
        } catch (err) { next(err); }
    }

    // PUT /api/matching/preference
    async updatePreference(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const dto = req.body as UpdatePreferenceDto;
            const pref = await matchingService.updatePreference(req.user!.id, dto);
            res.status(200).json({ status: 'success', data: { preference: pref } });
        } catch (err) { next(err); }
    }

    // GET /api/matching/interests/categories
    // Returns the full interest category list for the Pinterest picker UI
    async getInterestCategories(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            res.status(200).json({ status: 'success', data: { categories: INTEREST_CATEGORIES } });
        } catch (err) { next(err); }
    }
}

export const matchingController = new MatchingController();
