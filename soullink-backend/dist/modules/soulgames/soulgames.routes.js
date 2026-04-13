import { Router } from 'express';
import { SoulGamesController } from './soulgames.controller.js';
import { protect } from '../../middleware/auth.js';
const router = Router();
const controller = new SoulGamesController();
// All routes require authentication
router.get('/', protect, controller.getAllGames);
router.get('/personality', protect, controller.getPersonalityProfile);
router.get('/:id', protect, controller.getGameById);
router.post('/:id/respond', protect, controller.submitResponse);
router.post('/:id/complete', protect, controller.completeGame);
export default router;
