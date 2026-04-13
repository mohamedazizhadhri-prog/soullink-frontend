import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { SoulGamesService } from '../soulgames/soulgames.service.js';

const router = Router();
const soulGamesService = new SoulGamesService();

router.use(protect);

/**
 * GET /api/personality/me
 * Returns the current user's Big Five personality profile.
 * No separate service needed — the data lives in PersonalityProfile,
 * which is calculated and owned by the Soul Games module.
 */
router.get('/me', async (req: any, res, next) => {
    try {
        const profile = await soulGamesService.getPersonalityProfile(req.user!.id);
        res.status(200).json({ status: 'success', data: { profile } });
    } catch (err) { next(err); }
});

export default router;
