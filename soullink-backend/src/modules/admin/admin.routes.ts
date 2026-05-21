/**
 * Admin Routes — God-Mode API Surface
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §3
 *
 * All routes are protected by:
 *   protect          → must be authenticated (valid JWT)
 *   restrictTo('ADMIN') → must have role = ADMIN
 *
 * Endpoint map (matches the walkthrough plan §3.2–3.8):
 *
 * USERS
 *   GET    /api/admin/users                       → list all users
 *   GET    /api/admin/users/:id                   → user full detail
 *   PATCH  /api/admin/users/:id                   → update role/status/profile
 *   DELETE /api/admin/users/:id                   → soft or hard delete
 *   GET    /api/admin/users/:id/logins            → login history
 *   GET    /api/admin/users/:id/actions           → mod action history on user
 *   POST   /api/admin/users/:id/ban               → ban user
 *   POST   /api/admin/users/:id/unban             → unban user
 *   POST   /api/admin/users/:id/clear-face        → clear face descriptor
 *
 * MODERATORS
 *   GET    /api/admin/moderators                  → list all moderators + stats
 *   GET    /api/admin/moderators/:modId/actions   → full action log for one mod
 *
 * REPORTS
 *   GET    /api/admin/reports                     → list all reports (filterable)
 *   GET    /api/admin/reports/:id                 → report full detail
 *   PATCH  /api/admin/reports/:id                 → update report status/assignee
 *   POST   /api/admin/mod-actions/:actionId/reverse → override a moderator decision
 *
 * AI MODELS
 *   GET    /api/admin/ai/models                   → list all AI model versions
 *   POST   /api/admin/ai/models                   → deploy new AI model version
 *   PATCH  /api/admin/ai/models/:modelId          → update config / rollback (set isActive)
 *
 * COMMUNITIES
 *   GET    /api/admin/communities                 → list all servers
 *   GET    /api/admin/communities/:serverId       → server detail
 *   DELETE /api/admin/communities/:serverId       → dissolve server
 *   PATCH  /api/admin/communities/:serverId/visibility → toggle isPublic
 *
 * AUDIT LOGS
 *   GET    /api/admin/audit-logs                  → all audit logs (filterable)
 *   GET    /api/admin/token-blacklist             → view blacklisted tokens
 *
 * PLATFORM SETTINGS
 *   GET    /api/admin/settings/soul-games         → list soul games
 *   PATCH  /api/admin/settings/soul-games/:gameId/toggle  → enable/disable game
 *   PATCH  /api/admin/settings/soul-games/:gameId/reorder → change order
 */

import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.js';
import {
    // Users
    listUsers, getUserDetail, updateUser, deleteUser,
    getUserLoginHistory, getUserModHistory,
    banUser, unbanUser,

    clearFaceDescriptor,
    // Moderators
    listModerators, getModeratorActions,
    // Reports
    listReports, getReportDetail, updateReport, reverseModAction,
    // AI Models
    listAIModels, createAIModel, updateAIModel,
    // Communities
    listServers, getServerDetail, dissolveServer, toggleServerVisibility,
    // Audit
    listAuditLogs, listTokenBlacklist,
    listSystemLogs, listModLogs, listSecurityLogs,
    // Settings
    listSoulGames, toggleSoulGame, reorderSoulGame,
    // Appeals
    listAppeals, resolveAppeal,
    // Config EF-069
    getConfig, updateConfig,
} from './admin.controller.js';

const router = Router();

// Every route in this file requires a valid JWT + ADMIN role
router.use(protect, restrictTo('ADMIN'));

// ── §3.2 Users ───────────────────────────────────────────────────────────────
router.get('/users',                      listUsers);
router.get('/users/:id',                  getUserDetail);
router.patch('/users/:id',                updateUser);
router.delete('/users/:id',               deleteUser);
router.get('/users/:id/logins',           getUserLoginHistory);
router.get('/users/:id/actions',          getUserModHistory);
router.post('/users/:id/ban',             banUser);
router.post('/users/:id/unban',           unbanUser);
router.post('/users/:id/clear-face',      clearFaceDescriptor);

// ── §3.3 Moderators ───────────────────────────────────────────────────────────
router.get('/moderators',                 listModerators);
router.get('/moderators/:modId/actions',  getModeratorActions);

// ── §3.4 Reports & Mod Actions ───────────────────────────────────────────────
router.get('/reports',                    listReports);
router.get('/reports/:id',                getReportDetail);
router.patch('/reports/:id',              updateReport);
router.post('/mod-actions/:actionId/reverse', reverseModAction);

// ── §3.5 AI Model Management ─────────────────────────────────────────────────
router.get('/ai/models',                  listAIModels);
router.post('/ai/models',                 createAIModel);
router.patch('/ai/models/:modelId',       updateAIModel);

// ── §3.6 Community / Server Management ───────────────────────────────────────
router.get('/communities',                listServers);
router.get('/communities/:serverId',      getServerDetail);
router.delete('/communities/:serverId',   dissolveServer);
router.patch('/communities/:serverId/visibility', toggleServerVisibility);

// ── §3.7 Audit Logs ───────────────────────────────────────────────────────────
router.get('/audit-logs',                 listAuditLogs);
router.get('/token-blacklist',            listTokenBlacklist);
router.get('/system-logs',                listSystemLogs);
router.get('/mod-logs',                   listModLogs);
router.get('/security-logs',              listSecurityLogs);

// ── §3.8 Platform Settings ────────────────────────────────────────────────────
router.get('/settings/soul-games',                         listSoulGames);
router.patch('/settings/soul-games/:gameId/toggle',        toggleSoulGame);
router.patch('/settings/soul-games/:gameId/reorder',       reorderSoulGame);

// ── §3.9 Appeals (Admin Override) ───────────────────────────────────────────
router.get('/appeals',                    listAppeals);
router.post('/appeals/:id/resolve',       resolveAppeal);

// ── §3.10 Platform Config (EF-069) ───────────────────────────────────────────
router.get('/config',                     getConfig);
router.patch('/config/:key',              updateConfig);

export default router;
