import { Router } from 'express';
import { chatWithNova, getChatHistory } from './ai.controller.js';
import { protect } from '../../middleware/auth.js';
const router = Router();
// POST /api/ai/chat — Send a message to Nova
router.post('/chat', protect, chatWithNova);
// GET /api/ai/history — Load past conversation messages
router.get('/history', protect, getChatHistory);
export default router;
