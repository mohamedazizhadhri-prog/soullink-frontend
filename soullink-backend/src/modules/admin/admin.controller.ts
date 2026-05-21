/**
 * AdminController — HTTP handler layer
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan
 * Sections: 3.2–3.8
 *
 * Delegates all logic to AdminService. Handles input parsing, success
 * response formatting, and async error forwarding via next(err).
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { AdminService } from './admin.service.js';
import { configService } from './config.service.js';
import { bustModelCache } from '../ai-companion/llm.service.js';

const adminService = new AdminService();

/** Cast Express route param to string safely */
const p = (v: unknown): string => (Array.isArray(v) ? String(v[0]) : String(v ?? ''));
/** Cast Express query param to string | undefined */
const q = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
    if (typeof v === 'object') return undefined; // ParsedQs nested object — ignore
    return String(v);
};


// ─────────────────────────────────────────────────────────────────────────────
// §3.2 — User Management
// ─────────────────────────────────────────────────────────────────────────────

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page   = parseInt(q(req.query.page)  ?? '1') || 1;
        const limit  = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const result = await adminService.listUsers({
            page, limit,
            search: q(req.query.search),
            role:   q(req.query.role),
            status: q(req.query.status),
        });
        res.status(200).json({ status: 'success', data: result });
    } catch (err) { next(err); }
};

export const getUserDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.getUserDetail(p(req.params.id));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.updateUser(p(req.params.id), req.body, req.user!.id);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const hard = q(req.query.hard) === 'true';
        const data = await adminService.deleteUser(p(req.params.id), hard, req.user!.id);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const getUserLoginHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const limit = parseInt(q(req.query.limit) ?? '50') || 50;
        const data  = await adminService.getUserLoginHistory(p(req.params.id), limit);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const getUserModHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.getUserModHistory(p(req.params.id));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const banUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.banUser(p(req.params.id), req.user!.id, req.body.reason || 'No reason provided');
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const unbanUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.unbanUser(p(req.params.id), req.user!.id, req.body.reason || 'Admin unban');
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const clearFaceDescriptor = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.clearFaceDescriptor(p(req.params.id));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.3 — Moderator Management
// ─────────────────────────────────────────────────────────────────────────────

export const listModerators = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.listModerators();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const getModeratorActions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.getModeratorActions(p(req.params.modId));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.4 — Reports (God View)
// ─────────────────────────────────────────────────────────────────────────────

export const listReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page     = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit    = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const data = await adminService.listReports({
            page, limit,
            status:   q(req.query.status),
            category: q(req.query.category),
        });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const getReportDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.getReportDetail(p(req.params.id));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const updateReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.updateReport(p(req.params.id), req.body);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const reverseModAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.reverseModAction(
            p(req.params.actionId),
            req.user!.id,
            req.body.reason || 'Reversed by admin',
        );
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.5 — AI Model Management
// ─────────────────────────────────────────────────────────────────────────────

export const listAIModels = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.listAIModels();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const createAIModel = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.createAIModel(req.body, req.user!.id);
        res.status(201).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const updateAIModel = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.updateAIModel(p(req.params.modelId), req.body, req.user!.id);
        // EF-074: bust the LLM model cache so the new active model is picked up immediately
        if (req.body.isActive === true) bustModelCache();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.6 — Community / Server Management
// ─────────────────────────────────────────────────────────────────────────────

export const listServers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page   = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit  = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const search = q(req.query.search);
        const data = await adminService.listServers(page, limit, search);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const getServerDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.getServerDetail(p(req.params.serverId));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const dissolveServer = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.dissolveServer(p(req.params.serverId), req.user!.id);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const toggleServerVisibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.toggleServerVisibility(p(req.params.serverId), req.body.isPublic);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.7 — Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

export const listAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page     = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit    = Math.min(parseInt(q(req.query.limit) ?? '50') || 50, 200);
        const fromStr  = q(req.query.from);
        const toStr    = q(req.query.to);
        const data = await adminService.listAuditLogs({
            page, limit,
            serverId: q(req.query.serverId),
            actorId:  q(req.query.actorId),
            action:   q(req.query.action),
            from:     fromStr ? new Date(fromStr) : undefined,
            to:       toStr   ? new Date(toStr)   : undefined,
        });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const listSystemLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page    = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit   = Math.min(parseInt(q(req.query.limit) ?? '50') || 50, 200);
        const fromStr = q(req.query.from);
        const toStr   = q(req.query.to);
        const data = await adminService.listSystemLogs({
            page, limit,
            category: q(req.query.category),
            action:   q(req.query.action),
            actorId:  q(req.query.actorId),
            targetId: q(req.query.targetId),
            from:     fromStr ? new Date(fromStr) : undefined,
            to:       toStr   ? new Date(toStr)   : undefined,
        });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const listModLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page    = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit   = Math.min(parseInt(q(req.query.limit) ?? '50') || 50, 200);
        const fromStr = q(req.query.from);
        const toStr   = q(req.query.to);
        const data = await adminService.listModLogs({
            page, limit,
            action:   q(req.query.action),
            modId:    q(req.query.modId),
            targetId: q(req.query.targetId),
            from:     fromStr ? new Date(fromStr) : undefined,
            to:       toStr   ? new Date(toStr)   : undefined,
        });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const listSecurityLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page    = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit   = Math.min(parseInt(q(req.query.limit) ?? '50') || 50, 200);
        const fromStr = q(req.query.from);
        const toStr   = q(req.query.to);
        const successStr = q(req.query.success);
        const data = await adminService.listSecurityLogs({
            page, limit,
            userId:  q(req.query.userId),
            success: successStr !== undefined ? successStr === 'true' : undefined,
            from:    fromStr ? new Date(fromStr) : undefined,
            to:      toStr   ? new Date(toStr)   : undefined,
        });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const listTokenBlacklist = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page  = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit = parseInt(q(req.query.limit) ?? '50') || 50;
        const data  = await adminService.listTokenBlacklist(page, limit);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.8 — Platform Settings
// ─────────────────────────────────────────────────────────────────────────────

export const listSoulGames = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.listSoulGames();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const toggleSoulGame = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.toggleSoulGame(p(req.params.gameId), req.body.isActive);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const reorderSoulGame = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.reorderSoulGame(p(req.params.gameId), req.body.orderIndex);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// §3.9 — Appeals (Admin Override)
// ─────────────────────────────────────────────────────────────────────────────

export const listAppeals = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const page  = parseInt(q(req.query.page)  ?? '1')  || 1;
        const limit = Math.min(parseInt(q(req.query.limit) ?? '20') || 20, 100);
        const data  = await adminService.listAppeals({
            page, limit,
            status: q(req.query.status),
        });
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const resolveAppeal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await adminService.resolveAppeal(
            p(req.params.id),
            req.user!.id,
            req.body.decision,
            req.body.notes,
        );
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// ── §3.9 Platform Config (EF-069) ─────────────────────────────────────────────────

export const getConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const group = q(req.query.group);
        const data  = await configService.getGroup(group);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

export const updateConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            res.status(400).json({ status: 'error', message: '`value` is required' });
            return;
        }
        const data = await configService.set(p(req.params.key), String(value), req.user!.id);
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};
