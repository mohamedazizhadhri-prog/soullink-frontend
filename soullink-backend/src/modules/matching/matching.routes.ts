import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { matchingController } from './matching.controller.js';

const router = Router();

// All matching routes require authentication
router.use(protect);

// ─── SUGGESTIONS ──────────────────────────────────────────────────────────────
router.get('/suggestions',                       matchingController.getSuggestions.bind(matchingController));
router.post('/suggestions/:candidateId/action',  matchingController.actOnSuggestion.bind(matchingController));

// ─── ACTIVE MATCHES ───────────────────────────────────────────────────────────
router.get('/matches',                           matchingController.getActiveMatches.bind(matchingController));
router.post('/queue',                            matchingController.joinQueue.bind(matchingController));
router.post('/matches/:matchId/reveal',          matchingController.revealIdentity.bind(matchingController));
router.delete('/matches/:matchId',               matchingController.terminateMatch.bind(matchingController));

router.get('/matches/:matchId/messages',        matchingController.getMatchMessages.bind(matchingController));
router.post('/matches/:matchId/messages',       matchingController.sendMatchMessage.bind(matchingController));

// ─── PREFERENCE (INTENT + INTEREST PICKER) ───────────────────────────────────
router.get('/preference',                        matchingController.getPreference.bind(matchingController));
router.put('/preference',                        matchingController.updatePreference.bind(matchingController));

// ─── INTEREST CATEGORIES (for the Pinterest picker) ──────────────────────────
router.get('/interests/categories',              matchingController.getInterestCategories.bind(matchingController));

export default router;
