import { Router } from 'express';
import { chatWithNova, getChatHistory, getGameComment, investigate } from './ai.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// POST /api/ai/chat — Send a message to Nova
router.post('/chat', protect, chatWithNova);

// POST /api/ai/investigate — Internal system query (not saved to history)
router.post('/investigate', protect, investigate);

// GET /api/ai/history — Load past conversation messages
router.get('/history', protect, getChatHistory);

// POST /api/ai/game-comment — Get real-time Nova reaction after a scene choice
router.post('/game-comment', protect, getGameComment);

export default router;
