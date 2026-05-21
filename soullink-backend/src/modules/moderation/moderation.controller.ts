/**
 * ModerationController — HTTP handler layer
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan
 * Sections: 4.1–4.4
 *
 * All handlers are thin wrappers over ModerationService.
 * Admins accessing these endpoints get `isAdmin = true` via role check.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { ModerationService } from './moderation.service.js';

const moderationService = new ModerationService();

/** Cast Express route param to string safely */
const p = (v: unknown): string => (Array.isArray(v) ? String(v[0]) : String(v ?? ''));
/** Cast Express query param to string | undefined */
const q = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
    if (typeof v === 'object') return undefined;
    return String(v);
};

// ─────────────────────────────────────────────────────────────────────────────
// §4.1 — Report Queue
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/moderation/queue — My assigned report queue */
export const getQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page        = parseInt(q(req.query.page)  ?? '1') || 1;
        const limit       = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const unassigned  = q(req.query.unassigned) === 'true';
        const status      = q(req.query.status);
        const data = await moderationService.getQueue(req.user!.id, { page, limit, unassigned, status });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/** GET /api/moderation/reports/:id — Single report detail */
export const getReportDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user!.role === 'ADMIN';
        const data = await moderationService.getReportDetail(p(req.params.id), req.user!.id, isAdmin);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/** POST /api/moderation/reports/:id/assign — Self-assign a report */
export const assignReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await moderationService.assignReport(p(req.params.id), req.user!.id);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/**
 * POST /api/moderation/reports/:id/action — Issue a moderation action
 *
 * Body: { targetId, action, reason, duration?, expiresAt? }
 * Action types: WARNING | SUSPENSION | BAN | CONTENT_REMOVAL
 */
export const createModAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { targetId, action, reason, duration, expiresAt } = req.body;
        if (!targetId || !action || !reason) {
            res.status(400).json({ status: 'error', message: 'targetId, action, and reason are required' });
            return;
        }
        const data = await moderationService.createModAction({
            modId:    req.user!.id,
            reportId: p(req.params.id),
            targetId,
            action,
            reason,
            duration:  duration ? parseInt(duration) : undefined,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        });
        res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/** POST /api/moderation/reports/:id/dismiss — Dismiss a report */
export const dismissReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user!.role === 'ADMIN';
        const { reason } = req.body;
        const data = await moderationService.dismissReport(
            p(req.params.id),
            req.user!.id,
            reason || 'Dismissed by moderator',
            isAdmin,
        );
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §4.2 — Appeals (includes user-facing submission)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/moderation/appeals — User submits an appeal (any auth user) */
export const submitAppeal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { reportId, reason } = req.body;
        if (!reportId || !reason) {
            res.status(400).json({ status: 'error', message: 'reportId and reason are required' });
            return;
        }
        const data = await moderationService.submitAppeal(req.user!.id, reportId, reason);
        res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/** GET /api/moderation/appeals — List appeals */
export const listAppeals = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page   = parseInt(q(req.query.page)  ?? '1') || 1;
        const limit  = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const status = q(req.query.status);
        const data = await moderationService.listAppeals({ page, limit, status });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/** GET /api/moderation/appeals/:id — Appeal detail */
export const getAppealDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await moderationService.getAppealDetail(p(req.params.id));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/**
 * POST /api/moderation/appeals/:id/resolve — Accept or reject an appeal
 *
 * Body: { decision: 'ACCEPTED' | 'REJECTED', notes? }
 */
export const resolveAppeal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { decision, notes } = req.body;
        if (!decision || !['ACCEPTED', 'REJECTED'].includes(decision)) {
            res.status(400).json({ status: 'error', message: 'decision must be ACCEPTED or REJECTED' });
            return;
        }
        const data = await moderationService.resolveAppeal(
            p(req.params.id),
            req.user!.id,
            decision as 'ACCEPTED' | 'REJECTED',
            notes,
        );
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §4.4 — My Action History
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/moderation/my-actions — My full action history + stats */
export const getMyActions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page   = parseInt(q(req.query.page)  ?? '1') || 1;
        const limit  = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const action = q(req.query.action);
        const data = await moderationService.getMyActions(req.user!.id, { page, limit, action });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────────────────────────
// §4.5 — User-facing: My Reports (any authenticated user)
// ───────────────────────────────────────────────────────────────────────────────

/** GET /api/moderation/my-received-reports — Reports filed AGAINST the current user */
export const getMyReceivedReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page  = parseInt(q(req.query.page)  ?? '1') || 1;
        const limit = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const data  = await moderationService.getMyReceivedReports(req.user!.id, { page, limit });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

/** GET /api/moderation/my-filed-reports — Reports submitted BY the current user */
export const getMyFiledReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page  = parseInt(q(req.query.page)  ?? '1') || 1;
        const limit = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const data  = await moderationService.getMyFiledReports(req.user!.id, { page, limit });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};
