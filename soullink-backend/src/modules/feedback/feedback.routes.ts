/**
 * Feedback Routes
 *
 * POST   /api/feedback              → submit feedback (any authenticated user)
 * GET    /api/feedback/my           → list user's own feedback
 * GET    /api/feedback              → list all feedback (ADMIN / MODERATOR)
 * POST   /api/feedback/:id/reply    → reply to feedback (ADMIN / MODERATOR)
 * POST   /api/feedback/:id/close    → close feedback (ADMIN / MODERATOR)
 */

import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import {
    createFeedback,
    getMyFeedback,
    getAllFeedback,
    replyToFeedback,
    closeFeedback,
} from './feedback.controller.js';

const router = Router();

// All routes require authentication
router.use(protect);

// User endpoints
router.post('/', createFeedback);
router.get('/my', getMyFeedback);

// Admin/Moderator endpoints
router.get('/', restrictTo('ADMIN', 'MODERATOR'), getAllFeedback);
router.post('/:id/reply', restrictTo('ADMIN', 'MODERATOR'), replyToFeedback);
router.post('/:id/close', restrictTo('ADMIN', 'MODERATOR'), closeFeedback);

export default router;
