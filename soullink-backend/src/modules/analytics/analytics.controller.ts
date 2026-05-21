/**
 * AnalyticsController — HTTP handler layer
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §5
 * CDC: EF-058 → EF-066
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { AnalyticsService } from './analytics.service.js';
import { pollAllExternalServices } from '../../cron/usageTracker.js';

const svc = new AnalyticsService();

const q = (v: unknown): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
    if (typeof v === 'object') return undefined;
    return String(v);
};

const parseDays = (req: AuthRequest, def = 30) =>
    Math.min(parseInt(q(req.query.days) ?? String(def)) || def, 365);

// §5.1 — User Analytics
export const getUserAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getUserAnalytics(parseDays(req));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §5.2 — Matching Analytics
export const getMatchingAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getMatchingAnalytics(parseDays(req));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §5.3 — Soul Games Analytics
export const getSoulGamesAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getSoulGamesAnalytics();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §5.4 — Nova AI Analytics
export const getNovaAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getNovaAnalytics(parseDays(req));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §5.5 — Communication & Community Analytics
export const getCommunicationAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getCommunicationAnalytics(parseDays(req));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §5.6 — Security & Moderation Analytics
export const getModerationAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getModerationAnalytics(parseDays(req));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §5.7 — Credit Burn Gauges
export const getCreditUsage = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getCreditUsage();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// §3.1 — Overview KPI (landing dashboard)
export const getSystemAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = await svc.getSystemAnalytics(parseDays(req));
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};

// Manual refresh — forces immediate polling of ElevenLabs, Cloudinary, Pinecone
export const refreshCredits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await pollAllExternalServices();
        const data = await svc.getCreditUsage();
        res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
};
