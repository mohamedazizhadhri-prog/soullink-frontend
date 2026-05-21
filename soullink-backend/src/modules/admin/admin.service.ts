/**
 * AdminService — God-Mode DB Layer
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan
 * Sections: 3.2 User Management, 3.3 Moderator Management,
 *           3.4 Reports, 3.5 AI Models, 3.6 Communities, 3.8 Settings
 *
 * All write operations are ADMIN-only (enforced by the route layer via restrictTo).
 * Reads are paginated. Pagination uses cursor-based strategy for large tables.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — write a SystemLog entry (never throws)
// ─────────────────────────────────────────────────────────────────────────────
async function createSystemLog(opts: {
    category: 'ADMIN' | 'MODERATION' | 'SECURITY' | 'SYSTEM';
    action: string;
    actorId?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
}) {
    try {
        await prisma.systemLog.create({
            data: {
                category: opts.category,
                action:   opts.action,
                actorId:  opts.actorId  ?? null,
                targetId: opts.targetId ?? null,
                metadata: (opts.metadata ?? {}) as any,
            },
        });
    } catch {
        // Fire-and-forget — never let logging crash the parent operation
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// §3.2 — User Management
// ─────────────────────────────────────────────────────────────────────────────

export class AdminService {

    // ── List All Users (paginated, filterable) ────────────────────────────────
    async listUsers(params: {
        page: number;
        limit: number;
        search?: string;
        role?: string;
        status?: string;
    }) {
        const { page, limit, search, role, status } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (search) {
            where.OR = [
                { displayName: { contains: search, mode: 'insensitive' } },
                { handle: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (role)   where.role   = role;
        if (status) where.status = status;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, email: true, phone: true, displayName: true,
                    handle: true, role: true, status: true, emailVerified: true,
                    phoneVerified: true, faceVerified: true, country: true, city: true,
                    createdAt: true, lastLoginAt: true, avatarUrl: true,
                    _count: { select: { sentReports: true, receivedReports: true } },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, limit, pages: Math.ceil(total / limit) };
    }

    // ── Single User Full Detail ───────────────────────────────────────────────
    async getUserDetail(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                personalityProfile: true,
                novaMemory: true,
                loginHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
                modActions: {
                    include: { moderator: { select: { id: true, displayName: true, handle: true } } },
                    orderBy: { createdAt: 'desc' },
                },
                receivedReports: {
                    include: { reporter: { select: { id: true, displayName: true, handle: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!user) throw new AppError(404, 'User not found');
        return user;
    }

    // ── Update User (role, status, profile fields) ────────────────────────────
    async updateUser(userId: string, data: {
        displayName?: string;
        bio?: string;
        country?: string;
        city?: string;
        role?: string;
        status?: string;
        emailVerified?: boolean;
        phoneVerified?: boolean;
    }, actorId?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        const updated = await prisma.user.update({
            where: { id: userId },
            data: data as any,
            select: {
                id: true, displayName: true, handle: true, email: true,
                role: true, status: true, emailVerified: true, phoneVerified: true,
                country: true, city: true, updatedAt: true,
            },
        });

        // Log role changes specifically
        if (data.role && data.role !== user.role) {
            await createSystemLog({
                category: 'ADMIN',
                action:   'ROLE_CHANGED',
                actorId:  actorId ?? null,
                targetId: userId,
                metadata: { from: user.role, to: data.role, targetHandle: user.handle },
            });
        }
        // Log status changes (suspension, delete, etc.)
        if (data.status && data.status !== user.status) {
            await createSystemLog({
                category: 'ADMIN',
                action:   'STATUS_CHANGED',
                actorId:  actorId ?? null,
                targetId: userId,
                metadata: { from: user.status, to: data.status, targetHandle: user.handle },
            });
        }

        return updated;
    }

    // ── Delete User ───────────────────────────────────────────────────────────
    async deleteUser(userId: string, hard = false, actorId?: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        if (hard) {
            await prisma.user.delete({ where: { id: userId } });
            await createSystemLog({
                category: 'ADMIN', action: 'USER_HARD_DELETED',
                actorId: actorId ?? null, targetId: userId,
                metadata: { handle: user.handle, displayName: user.displayName },
            });
            return { message: 'User permanently deleted' };
        } else {
            await prisma.user.update({ where: { id: userId }, data: { status: 'DELETED' } });
            await createSystemLog({
                category: 'ADMIN', action: 'USER_SOFT_DELETED',
                actorId: actorId ?? null, targetId: userId,
                metadata: { handle: user.handle, displayName: user.displayName },
            });
            return { message: 'User soft-deleted (status = DELETED)' };
        }
    }

    // ── Login History ─────────────────────────────────────────────────────────
    async getUserLoginHistory(userId: string, limit = 50) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        return prisma.loginHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    // ── Mod Action History on a User ──────────────────────────────────────────
    async getUserModHistory(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        return prisma.modAction.findMany({
            where: { targetId: userId },
            include: { moderator: { select: { id: true, displayName: true, handle: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── Ban / Unban User ──────────────────────────────────────────────────────
    async banUser(targetId: string, modId: string, reason: string) {
        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) throw new AppError(404, 'User not found');

        await Promise.all([
            prisma.user.update({ where: { id: targetId }, data: { status: 'BANNED' } }),
            prisma.modAction.create({
                data: { targetId, modId, action: 'BAN', reason },
            }),
        ]);

        await createSystemLog({
            category: 'ADMIN',
            action:   'USER_BANNED',
            actorId:  modId,
            targetId,
            metadata: { reason, targetHandle: user.handle, targetDisplayName: user.displayName },
        });

        return { message: 'User banned successfully' };
    }

    async unbanUser(targetId: string, modId: string, reason: string) {
        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) throw new AppError(404, 'User not found');

        await Promise.all([
            prisma.user.update({ where: { id: targetId }, data: { status: 'ACTIVE' } }),
            prisma.modAction.create({
                data: { targetId, modId, action: 'UNBAN', reason },
            }),
        ]);

        await createSystemLog({
            category: 'ADMIN',
            action:   'USER_UNBANNED',
            actorId:  modId,
            targetId,
            metadata: { reason, targetHandle: user.handle },
        });

        return { message: 'User unbanned successfully' };
    }

    // ── Clear Face Descriptor ─────────────────────────────────────────────────
    async clearFaceDescriptor(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        return prisma.user.update({
            where: { id: userId },
            data: { faceDescriptor: Prisma.JsonNull, faceVerified: false, lastFaceVerify: null },
            select: { id: true, displayName: true, faceVerified: true },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.3 — Moderator Management
    // ─────────────────────────────────────────────────────────────────────────

    async listModerators() {
        const mods = await prisma.user.findMany({
            where: { role: 'MODERATOR' },
            select: {
                id: true, displayName: true, handle: true, email: true,
                status: true, createdAt: true, lastLoginAt: true, avatarUrl: true,
                modActionsBy: {
                    select: { action: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
                _count: { select: { modActionsBy: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Compute performance stats per moderator
        return mods.map((mod) => {
            const actions    = mod.modActionsBy;
            const warnings   = actions.filter(a => a.action === 'WARNING').length;
            const suspensions= actions.filter(a => a.action === 'SUSPENSION').length;
            const bans       = actions.filter(a => a.action === 'BAN').length;

            return {
                ...mod,
                stats: { totalActions: mod._count.modActionsBy, warnings, suspensions, bans },
            };
        });
    }

    async getModeratorActions(modId: string) {
        const mod = await prisma.user.findUnique({ where: { id: modId } });
        if (!mod) throw new AppError(404, 'Moderator not found');

        return prisma.modAction.findMany({
            where: { modId },
            include: { target: { select: { id: true, displayName: true, handle: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.4 — Reports (Admin God View)
    // ─────────────────────────────────────────────────────────────────────────

    async listReports(params: { page: number; limit: number; status?: string; category?: string }) {
        const { page, limit, status, category } = params;
        const skip = (page - 1) * limit;
        const where: any = {};
        if (status)   where.status   = status;
        if (category) where.category = category;

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    reporter: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    reported: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    modActions: {
                        include: { moderator: { select: { id: true, displayName: true, handle: true } } },
                        orderBy: { createdAt: 'desc' as const },
                    },
                    appeal: true,
                },
            }),
            prisma.report.count({ where }),
        ]);

        return { reports, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async getReportDetail(reportId: string) {
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                reporter:   { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                reported:   { select: { id: true, displayName: true, handle: true, avatarUrl: true, status: true } },
                modActions: { include: { moderator: { select: { id: true, displayName: true } } } },
                appeal:     true,
            },
        });
        if (!report) throw new AppError(404, 'Report not found');
        return report;
    }

    async updateReport(reportId: string, data: { status?: string; assignedModId?: string }) {
        const report = await prisma.report.findUnique({ where: { id: reportId } });
        if (!report) throw new AppError(404, 'Report not found');
        return prisma.report.update({ where: { id: reportId }, data: data as any });
    }

    // Override / reverse a mod action (admin-only power)
    async reverseModAction(modActionId: string, adminId: string, reason: string) {
        const action = await prisma.modAction.findUnique({ where: { id: modActionId } });
        if (!action) throw new AppError(404, 'Mod action not found');

        // If the action was a BAN or SUSPENSION, restore user to ACTIVE
        if (action.action === 'BAN' || action.action === 'SUSPENSION') {
            await prisma.user.update({
                where: { id: action.targetId },
                data: { status: 'ACTIVE' },
            });
        }

        // Log the reversal as an UNBAN action by the admin
        await prisma.modAction.create({
            data: {
                targetId: action.targetId,
                modId:    adminId,
                action:   'UNBAN',
                reason:   `Admin reversal of action ${modActionId}: ${reason}`,
            },
        });

        return { message: 'Mod action reversed, user restored to ACTIVE' };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.5 — AI Model Management
    // ─────────────────────────────────────────────────────────────────────────

    async listAIModels() {
        return prisma.aIModelVersion.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async createAIModel(data: {
        name: string;
        version: string;
        type: string;
        config?: object;
        isActive?: boolean;
    }, actorId?: string) {
        // If the new model is active, deactivate all others
        if (data.isActive) {
            await prisma.aIModelVersion.updateMany({ data: { isActive: false } });
        }
        const model = await prisma.aIModelVersion.create({
            data: {
                name: data.name,
                version: data.version,
                type: data.type,
                config: (data.config ?? {}) as any,
                isActive: data.isActive ?? false,
                deployedAt: data.isActive ? new Date() : undefined,
            },
        });
        await createSystemLog({
            category: 'SYSTEM', action: 'AI_MODEL_CREATED',
            actorId:  actorId ?? null, targetId: model.id,
            metadata: { name: data.name, version: data.version, type: data.type, isActive: data.isActive },
        });
        return model;
    }

    async updateAIModel(modelId: string, data: { config?: object; isActive?: boolean }, actorId?: string) {
        const model = await prisma.aIModelVersion.findUnique({ where: { id: modelId } });
        if (!model) throw new AppError(404, 'AI model not found');

        let updated;
        // If activating this model, deactivate all others (rollback pattern)
        if (data.isActive === true) {
            await prisma.aIModelVersion.updateMany({ data: { isActive: false } });
            updated = await prisma.aIModelVersion.update({
                where: { id: modelId },
                data: { ...data, deployedAt: new Date() },
            });
            await createSystemLog({
                category: 'SYSTEM', action: 'AI_MODEL_DEPLOYED',
                actorId:  actorId ?? null, targetId: modelId,
                metadata: { name: model.name, version: model.version, type: model.type },
            });
        } else {
            updated = await prisma.aIModelVersion.update({ where: { id: modelId }, data });
        }
        return updated;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.6 — Community / Server Management
    // ─────────────────────────────────────────────────────────────────────────

    async listServers(page = 1, limit = 20, search?: string) {
        const skip = (page - 1) * limit;
        const where: any = search
            ? { name: { contains: search, mode: 'insensitive' } }
            : {};

        const [servers, total] = await Promise.all([
            prisma.server.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { members: true, channels: true } },
                },
            }),
            prisma.server.count({ where }),
        ]);

        return { servers, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async getServerDetail(serverId: string) {
        const server = await prisma.server.findUnique({
            where: { id: serverId },
            include: {
                members:  { include: { user: { select: { id: true, displayName: true, handle: true, avatarUrl: true } } }, orderBy: { joinedAt: 'asc' } },
                channels: { orderBy: { orderIndex: 'asc' } },
                bans:     { include: { user: { select: { id: true, displayName: true } } } },
                auditLogs:{ orderBy: { createdAt: 'desc' }, take: 30 },
            },
        });
        if (!server) throw new AppError(404, 'Server not found');
        return server;
    }

    async dissolveServer(serverId: string, actorId?: string) {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new AppError(404, 'Server not found');
        await prisma.server.delete({ where: { id: serverId } });
        await createSystemLog({
            category: 'ADMIN', action: 'SERVER_DISSOLVED',
            actorId:  actorId ?? null, targetId: serverId,
            metadata: { serverName: server.name, serverId },
        });
        return { message: `Server "${server.name}" has been dissolved` };
    }

    async toggleServerVisibility(serverId: string, isPublic: boolean) {
        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) throw new AppError(404, 'Server not found');
        return prisma.server.update({ where: { id: serverId }, data: { isPublic } });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.7 — Audit Logs
    // ─────────────────────────────────────────────────────────────────────────

    async listAuditLogs(params: {
        page: number;
        limit: number;
        serverId?: string;
        actorId?: string;
        action?: string;
        from?: Date;
        to?: Date;
    }) {
        const { page, limit, serverId, actorId, action, from, to } = params;
        const skip   = (page - 1) * limit;
        const where: any = {};
        if (serverId) where.serverId = serverId;
        if (actorId)  where.actorId  = actorId;
        if (action)   where.action   = { contains: action, mode: 'insensitive' };
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = from;
            if (to)   where.createdAt.lte = to;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { actor: { select: { id: true, displayName: true, handle: true } } },
            }),
            prisma.auditLog.count({ where }),
        ]);

        return { logs, total, page, limit, pages: Math.ceil(total / limit) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.7b — System Logs (new global audit trail)
    // ─────────────────────────────────────────────────────────────────────────

    async listSystemLogs(params: {
        page: number;
        limit: number;
        category?: string;
        action?: string;
        actorId?: string;
        targetId?: string;
        from?: Date;
        to?: Date;
    }) {
        const { page, limit, category, action, actorId, targetId, from, to } = params;
        const skip  = (page - 1) * limit;
        const where: any = {};
        if (category) where.category = category;
        if (action)   where.action   = { contains: action, mode: 'insensitive' };
        if (actorId)  where.actorId  = actorId;
        if (targetId) where.targetId = targetId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = from;
            if (to)   where.createdAt.lte = to;
        }

        const [logs, total] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { actor: { select: { id: true, displayName: true, handle: true, avatarUrl: true, role: true } } },
            }),
            prisma.systemLog.count({ where }),
        ]);

        return { logs, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async listModLogs(params: {
        page: number;
        limit: number;
        action?: string;
        modId?: string;
        targetId?: string;
        from?: Date;
        to?: Date;
    }) {
        const { page, limit, action, modId, targetId, from, to } = params;
        const skip  = (page - 1) * limit;
        const where: any = {};
        if (action)   where.action   = action;
        if (modId)    where.modId    = modId;
        if (targetId) where.targetId = targetId;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = from;
            if (to)   where.createdAt.lte = to;
        }

        const [logs, total] = await Promise.all([
            prisma.modAction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    moderator: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    target:    { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    report:    { select: { id: true, category: true, status: true } },
                },
            }),
            prisma.modAction.count({ where }),
        ]);

        return { logs, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async listSecurityLogs(params: {
        page: number;
        limit: number;
        userId?: string;
        success?: boolean;
        from?: Date;
        to?: Date;
    }) {
        const { page, limit, userId, success, from, to } = params;
        const skip  = (page - 1) * limit;
        const where: any = {};
        if (userId  !== undefined) where.userId  = userId;
        if (success !== undefined) where.success = success;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = from;
            if (to)   where.createdAt.lte = to;
        }

        const [logs, total] = await Promise.all([
            prisma.loginHistory.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, displayName: true, handle: true, avatarUrl: true, role: true } } },
            }),
            prisma.loginHistory.count({ where }),
        ]);

        return { logs, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async listTokenBlacklist(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [entries, total] = await Promise.all([
            prisma.tokenBlacklist.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.tokenBlacklist.count(),
        ]);
        return { entries, total };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.8 — Platform Settings
    // ─────────────────────────────────────────────────────────────────────────

    async listSoulGames() {
        return prisma.soulGame.findMany({ orderBy: { orderIndex: 'asc' } });
    }

    async toggleSoulGame(gameId: string, isActive: boolean) {
        const game = await prisma.soulGame.findUnique({ where: { id: gameId } });
        if (!game) throw new AppError(404, 'Soul game not found');
        return prisma.soulGame.update({ where: { id: gameId }, data: { isActive } });
    }

    async reorderSoulGame(gameId: string, orderIndex: number) {
        const game = await prisma.soulGame.findUnique({ where: { id: gameId } });
        if (!game) throw new AppError(404, 'Soul game not found');
        return prisma.soulGame.update({ where: { id: gameId }, data: { orderIndex } });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.9 — Appeals (Admin Override)
    // ─────────────────────────────────────────────────────────────────────────

    /** List ALL appeals platform-wide (admin god-view) */
    async listAppeals(params: { page: number; limit: number; status?: string }) {
        const { page, limit, status } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status) where.status = status;

        const [appeals, total] = await Promise.all([
            prisma.appeal.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user:   { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    report: {
                        include: {
                            modActions: { include: { moderator: { select: { id: true, displayName: true } } } },
                        },
                    },
                },
            }),
            prisma.appeal.count({ where }),
        ]);

        return { appeals, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /**
     * Admin override: resolve an appeal regardless of who was assigned.
     *  - ACCEPTED → user restored to ACTIVE, audit trail created
     *  - REJECTED → notes recorded
     */
    async resolveAppeal(appealId: string, adminId: string, decision: 'ACCEPTED' | 'REJECTED', notes?: string) {
        const appeal = await prisma.appeal.findUnique({
            where: { id: appealId },
            include: { report: { include: { modActions: { orderBy: { createdAt: 'desc' } } } } },
        });

        if (!appeal) throw new AppError(404, 'Appeal not found');
        if (appeal.status !== 'PENDING') throw new AppError(409, 'Appeal has already been resolved');

        await prisma.appeal.update({
            where: { id: appealId },
            data:  { status: decision, reviewedBy: adminId, reviewedAt: new Date(), ...(notes ? { notes } : {}) },
        });

        if (decision === 'ACCEPTED') {
            // Restore user
            await prisma.user.update({
                where: { id: appeal.userId },
                data:  { status: 'ACTIVE' },
            });

            // Audit trail
            await prisma.modAction.create({
                data: {
                    targetId: appeal.userId,
                    modId:    adminId,
                    action:   'UNBAN',
                    reason:   `Appeal accepted by admin (Appeal #${appealId})`,
                    reportId: appeal.reportId,
                },
            });

            // Update report status
            if (appeal.reportId) {
                await prisma.report.update({
                    where: { id: appeal.reportId },
                    data:  { status: 'APPEALED' },
                });
            }
        }

        return { message: `Appeal ${decision.toLowerCase()} successfully` };
    }
}
