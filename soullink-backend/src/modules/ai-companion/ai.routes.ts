import { Router } from 'express';
import { chatWithNova } from './ai.controller.js';
import { protect } from '../../middleware/auth.js';

const router = Router();

// /api/ai/chat
router.post('/chat', protect, chatWithNova);

export default router;
