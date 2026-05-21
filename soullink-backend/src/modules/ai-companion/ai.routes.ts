import { Router } from 'express';
import { chatWithNova, getChatHistory, getGameComment, investigate, streamTts, triggerEvent } from './ai.controller.js';
import { protect, AuthRequest } from '../../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit: 20 messages per minute per user
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    keyGenerator: (req) => (req as AuthRequest).user?.id || req.ip?.toString() || 'anonymous',
    message: { status: 'error', message: 'Nova needs a moment to catch her breath. Please wait a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /api/ai/chat — Send a message to Nova
router.post('/chat', protect, chatLimiter, chatWithNova);

// POST /api/ai/investigate — Internal system query (not saved to history)
router.post('/investigate', protect, chatLimiter, investigate);

// GET /api/ai/history — Load past conversation messages
router.get('/history', protect, getChatHistory);

// POST /api/ai/game-comment — Get real-time Nova reaction after a scene choice
router.post('/game-comment', protect, chatLimiter, getGameComment);

// POST /api/ai/tts — Stream Nova's voice as audio/mpeg (secured, free-plan safe)
router.post('/tts', protect, streamTts);

// POST /api/ai/event — Frontend-triggered proactive event (Nova reacts to user actions)
router.post('/event', protect, chatLimiter, triggerEvent);

export default router;
