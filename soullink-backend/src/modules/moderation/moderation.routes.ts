/**
 * Moderation Routes — Scoped Moderator API
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §4
 *
 * All routes require:
 *   protect                          → valid JWT
 *   restrictTo('ADMIN', 'MODERATOR') → ADMIN or MODERATOR role
 *
 * Key scoping rules (enforced in the SERVICE layer, not here):
 *   - Moderators only see their ASSIGNED reports
 *   - Admins bypass queue scoping (isAdmin flag in service calls)
 *   - Neither role can access admin-only endpoints (those are in admin.routes.ts)
 *
 * Endpoint map (matches §4.1–4.4 of the walkthrough plan):
 *
 * §4.1 REPORT QUEUE
 *   GET    /api/moderation/queue                  → my assigned queue (PENDING + UNDER_REVIEW)
 *   GET    /api/moderation/reports/:id            → single report detail
 *   POST   /api/moderation/reports/:id/assign     → self-assign an unassigned report
 *   POST   /api/moderation/reports/:id/action     → issue WARNING|SUSPENSION|BAN|CONTENT_REMOVAL
 *   POST   /api/moderation/reports/:id/dismiss    → dismiss with written reason
 *
 * §4.2 APPEALS QUEUE
 *   GET    /api/moderation/appeals                → list PENDING appeals
 *   GET    /api/moderation/appeals/:id            → appeal full detail
 *   POST   /api/moderation/appeals/:id/resolve    → accept or reject
 *
 * §4.4 MY ACTION HISTORY
 *   GET    /api/moderation/my-actions             → my action log + stats
 */

import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import {
    // §4.1 Report Queue
    getQueue,
    getReportDetail,
    assignReport,
    createModAction,
    dismissReport,
    // §4.2 Appeals
    submitAppeal,
    listAppeals,
    getAppealDetail,
    resolveAppeal,
    // §4.4 History
    getMyActions,
    // §4.5 User-facing
    getMyReceivedReports,
    getMyFiledReports,
} from './moderation.controller.js';

const router = Router();

// ── User-facing: appeal submission + my reports (any authenticated user) ──────────────────
router.post('/appeals', protect, submitAppeal);
router.get('/my-received-reports', protect, getMyReceivedReports);
router.get('/my-filed-reports',    protect, getMyFiledReports);

// Every route below requires a valid JWT + ADMIN or MODERATOR role
router.use(protect, restrictTo('ADMIN', 'MODERATOR'));

// ── §4.1 Report Queue ────────────────────────────────────────────────────────
router.get('/queue',                         getQueue);
router.get('/reports/:id',                   getReportDetail);
router.post('/reports/:id/assign',           assignReport);
router.post('/reports/:id/action',           createModAction);
router.post('/reports/:id/dismiss',          dismissReport);

// ── §4.2 Appeals Queue ───────────────────────────────────────────────────────
router.get('/appeals',                       listAppeals);
router.get('/appeals/:id',                   getAppealDetail);
router.post('/appeals/:id/resolve',          resolveAppeal);

// ── §4.4 My Action History ───────────────────────────────────────────────────
router.get('/my-actions',                    getMyActions);

export default router;
