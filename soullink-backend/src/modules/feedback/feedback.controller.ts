/**
 * FeedbackController — Express request handlers for feedback endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from './feedback.service.js';
import { AppError } from '../../middleware/errorHandler.js';

const svc = new FeedbackService();

/** POST /api/feedback — submit a new feedback */
export const createFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { title, content, category } = req.body;

        if (!title || !content) {
            throw new AppError(400, 'Title and content are required');
        }

        const feedback = await svc.createFeedback({ userId, title, content, category: category || 'OTHER' });
        res.status(201).json({ status: 'success', data: { feedback } });
    } catch (err) {
        next(err);
    }
};

/** GET /api/feedback/my — get the authenticated user's feedbacks */
export const getMyFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const feedbacks = await svc.getMyFeedback(userId);
        res.status(200).json({ status: 'success', data: { feedbacks } });
    } catch (err) {
        next(err);
    }
};

/** GET /api/feedback — get all feedbacks (admin/moderator only) */
export const getAllFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status as string | undefined;
        const search = req.query.search as string | undefined;
        const page = parseInt(String(req.query.page ?? '1'), 10);
        const limit = parseInt(String(req.query.limit ?? '20'), 10);

        const data = await svc.getAllFeedback({ status, search, page, limit });
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};

/** POST /api/feedback/:id/reply — reply to feedback (admin/moderator only) */
export const replyToFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const responderId = (req as any).user.id;
        const { id } = req.params;
        const { reply } = req.body;

        if (!reply) throw new AppError(400, 'Reply text is required');

        const feedback = await svc.replyToFeedback(id, responderId, reply);
        res.status(200).json({ status: 'success', data: { feedback } });
    } catch (err) {
        next(err);
    }
};

/** POST /api/feedback/:id/close — close a feedback (admin/moderator only) */
export const closeFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const feedback = await svc.closeFeedback(id);
        res.status(200).json({ status: 'success', data: { feedback } });
    } catch (err) {
        next(err);
    }
};
