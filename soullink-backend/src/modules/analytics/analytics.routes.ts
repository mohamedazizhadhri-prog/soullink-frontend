/**
 * Analytics Routes — Full 6-Domain Dashboard API
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §5
 * CDC: EF-058 → EF-066
 *
 * All routes: protect + restrictTo('ADMIN') — analytics is admin-only (§7 table).
 *
 * Endpoint map:
 *   GET /api/analytics/system         → §3.1 Overview KPIs (reads AnalyticsSnapshot or live fallback)
 *   GET /api/analytics/users          → §5.1 User analytics (DAU, funnel, status, timezones)
 *   GET /api/analytics/matching       → §5.2 Match rate, intent distribution, compatibility
 *   GET /api/analytics/soul-games     → §5.3 Completion rates, drop-off, emotion frequency
 *   GET /api/analytics/nova           → §5.4 AI conversations, trust, proactive msgs, API usage
 *   GET /api/analytics/communication  → §5.5 DMs/day, channel msgs, server growth, friendship funnel
 *   GET /api/analytics/moderation     → §5.6 Reports/day, resolution rate, ban trends, appeals
 *   GET /api/analytics/credits        → §5.7 API credit burn gauges per service
 *
 * All accept optional ?days=N query param (default 30, max 365).
 */

import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import {
    getSystemAnalytics,
    getUserAnalytics,
    getMatchingAnalytics,
    getSoulGamesAnalytics,
    getNovaAnalytics,
    getCommunicationAnalytics,
    getModerationAnalytics,
    getCreditUsage,
    refreshCredits,
} from './analytics.controller.js';

const router = Router();

// Every analytics endpoint is ADMIN-only
router.use(protect, restrictTo('ADMIN'));

// §3.1 — Landing dashboard KPI overview
router.get('/system', getSystemAnalytics);

// §5.1–5.6 — Domain dashboards
router.get('/users',         getUserAnalytics);
router.get('/matching',      getMatchingAnalytics);
router.get('/soul-games',    getSoulGamesAnalytics);
router.get('/nova',          getNovaAnalytics);
router.get('/communication', getCommunicationAnalytics);
router.get('/moderation',    getModerationAnalytics);

// §5.7 — Credit burn gauges
router.get('/credits', getCreditUsage);
router.post('/credits/refresh', refreshCredits);

export default router;
