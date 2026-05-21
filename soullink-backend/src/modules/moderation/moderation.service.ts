/**
 * ModerationService — Scoped Moderator DB Layer
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan
 * Sections: 4.1 Report Queue, 4.2 Appeals, 4.4 My History
 *
 * Key constraint: Moderators only see/act on their ASSIGNED queue.
 * They cannot see other mods' queues, change roles, or access system settings.
 * All permission enforcement is done in the route layer (restrictTo middleware)
 * but scoping (to assigned queue) is enforced HERE in service logic.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { notificationsService } from '../notifications/notifications.service.js';
import { io } from '../../server.js';

/** Cast any value to string | undefined safely */
const safe = (v: unknown): string | undefined =>
    v === undefined || v === null ? undefined : String(v);

export class ModerationService {

    // ─────────────────────────────────────────────────────────────────────────
    // §4.1 — Report Queue
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * List reports for a moderator.
     * By default shows their assigned queue (PENDING + UNDER_REVIEW).
     * If `unassigned=true`, shows all unassigned PENDING reports they can pick up.
     */
    async getQueue(modId: string, params: {
        page: number;
        limit: number;
        unassigned?: boolean;
        status?: string;
    }) {
        const { page, limit, unassigned, status } = params;
        const skip = (page - 1) * limit;

        const where: any = unassigned
            ? { assignedModId: null, status: 'PENDING' }
            : {
                assignedModId: modId,
                status: status ?? { in: ['PENDING', 'UNDER_REVIEW'] },
              };

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' }, // Oldest first — FIFO queue
                include: {
                    reporter: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    reported: {
                        select: {
                            id: true, displayName: true, handle: true, avatarUrl: true, status: true,
                            _count: { select: { receivedReports: true, modActions: true } },
                        },
                    },
                    modActions: { orderBy: { createdAt: 'desc' } },
                    appeal: true,
                },
            }),
            prisma.report.count({ where }),
        ]);

        return { reports, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /** Get full detail of one report — only if assigned to this mod */
    async getReportDetail(reportId: string, modId: string, isAdmin = false) {
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: {
                reporter:   { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                reported:   {
                    include: {
                        personalityProfile: { select: { openness: true, conscientiousness: true, extraversion: true, agreeableness: true, neuroticism: true } },
                        modActions:  { orderBy: { createdAt: 'desc' }, take: 20 },
                        receivedReports: { select: { id: true, category: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
                    },
                },
                modActions: { include: { moderator: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' } },
                appeal:     true,
            },
        });

        if (!report) throw new AppError(404, 'Report not found');

        // Scoping: non-admin mods can only see reports assigned to them
        if (!isAdmin && report.assignedModId !== modId) {
            throw new AppError(403, 'This report is not assigned to you');
        }

        return report;
    }

    /** Self-assign an unassigned report */
    async assignReport(reportId: string, modId: string) {
        const report = await prisma.report.findUnique({ where: { id: reportId } });
        if (!report) throw new AppError(404, 'Report not found');
        if (report.assignedModId && report.assignedModId !== modId) {
            throw new AppError(409, 'This report is already assigned to another moderator');
        }

        return prisma.report.update({
            where: { id: reportId },
            data:  { assignedModId: modId, status: 'UNDER_REVIEW' },
        });
    }

    /**
     * Issue a moderation action on a user linked to a report.
     * This is the core workhorse: warnings, mutes, suspensions, bans, content removal.
     */
    async createModAction(params: {
        modId: string;
        reportId?: string;
        targetId: string;
        action: string;
        reason: string;
        duration?: number;
        expiresAt?: Date;
    }) {
        const { modId, reportId, targetId, action, reason, duration, expiresAt } = params;

        // Verify target user exists
        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) throw new AppError(404, 'Target user not found');

        // Build the mod action record
        const modAction = await prisma.modAction.create({
            data: {
                modId,
                targetId,
                reportId: reportId ?? null,
                action: action as any,
                reason,
                duration:  duration ?? null,
                expiresAt: expiresAt ?? null,
            },
            include: {
                moderator: { select: { id: true, displayName: true } },
                target:    { select: { id: true, displayName: true, handle: true } },
            },
        });

        // Side effects: update user status for hard actions
        const statusMap: Record<string, string> = {
            SUSPENSION: 'SUSPENDED',
            BAN:        'BANNED',
            UNBAN:      'ACTIVE',
        };
        if (statusMap[action]) {
            await prisma.user.update({
                where: { id: targetId },
                data:  { status: statusMap[action] as any },
            });

            // Force immediate logout for banned/suspended users
            if ((action === 'BAN' || action === 'SUSPENSION') && io) {
                io.to(`user:${targetId}`).emit('auth:force_logout', { action, reason });
            }
        }

        // Auto-resolve the linked report when a terminal action is taken
        if (reportId) {
            const resolvedStatusMap: Record<string, string> = {
                WARNING:         'RESOLVED_WARNING',
                SUSPENSION:      'RESOLVED_SUSPENSION',
                BAN:             'RESOLVED_BAN',
                CONTENT_REMOVAL: 'RESOLVED_WARNING', // mild resolve
            };
            const resolvedStatus = resolvedStatusMap[action];
            if (resolvedStatus) {
                const updatedReport = await prisma.report.update({
                    where: { id: reportId },
                    data:  { status: resolvedStatus as any, resolvedAt: new Date() },
                });

                // Notify the reporter that their report has been acted upon
                await notificationsService.createNotification(updatedReport.reporterId, {
                    type: 'REPORT_RESOLVED',
                    title: 'Your report has been reviewed',
                    body: 'A moderator has reviewed your report and taken appropriate action. Thank you for helping keep the community safe.',
                    metadata: { reportId, action },
                });
            }
        }

        // Notify the reported user about the action taken against them
        await notificationsService.createNotification(targetId, {
            type: 'MODERATION_ACTION',
            title: `Account Action: ${action.replace('_', ' ')}`,
            body: `A moderator has reviewed a report and taken action on your account. Reason: ${reason}`,
            metadata: { action, duration, reportId },
        });

        return modAction;
    }

    /** Dismiss a report (no action needed) */
    async dismissReport(reportId: string, modId: string, reason: string, isAdmin = false) {
        const report = await prisma.report.findUnique({ where: { id: reportId } });
        if (!report) throw new AppError(404, 'Report not found');
        if (!isAdmin && report.assignedModId !== modId) {
            throw new AppError(403, 'This report is not assigned to you');
        }

        const dismissed = await prisma.report.update({
            where: { id: reportId },
            data:  { status: 'DISMISSED', resolvedAt: new Date() },
        });

        // Notify the reporter that their report was reviewed but dismissed
        await notificationsService.createNotification(dismissed.reporterId, {
            type: 'REPORT_DISMISSED',
            title: 'Your report has been reviewed',
            body: 'A moderator reviewed your report and determined no further action was necessary at this time.',
            metadata: { reportId },
        });

        return dismissed;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §4.2 — Appeals Queue
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * User-facing: submit an appeal against a resolved report.
     * Only allowed when the report resulted in BAN or SUSPENSION.
     * One appeal per report.
     */
    async submitAppeal(userId: string, reportId: string, reason: string) {
        const report = await prisma.report.findUnique({
            where: { id: reportId },
            include: { appeal: true },
        });

        if (!report) throw new AppError(404, 'Report not found');
        if (report.reportedId !== userId) {
            throw new AppError(403, 'You can only appeal reports filed against you');
        }

        // Only allow appeals for terminal actions or warnings
        const appealableStatuses = ['RESOLVED_BAN', 'RESOLVED_SUSPENSION', 'RESOLVED_WARNING'];
        if (!appealableStatuses.includes(report.status)) {
            throw new AppError(400, 'This report cannot be appealed (status: ' + report.status + ')');
        }

        // One appeal per report
        if (report.appeal) {
            throw new AppError(409, 'An appeal has already been submitted for this report');
        }

        if (reason.length < 20) {
            throw new AppError(400, 'Appeal reason must be at least 20 characters');
        }

        return prisma.appeal.create({
            data: { reportId, userId, reason },
        });
    }

    /** List all pending appeals — available to both ADMIN and MODERATOR */
    async listAppeals(params: { page: number; limit: number; status?: string }) {
        const { page, limit, status } = params;
        const skip = (page - 1) * limit;

        const where: any = { status: status ?? 'PENDING' };

        const [appeals, total] = await Promise.all([
            prisma.appeal.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' }, // Oldest first
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

    /** Get full detail of one appeal */
    async getAppealDetail(appealId: string) {
        const appeal = await prisma.appeal.findUnique({
            where: { id: appealId },
            include: {
                user:   {
                    select: {
                        id: true, displayName: true, handle: true, avatarUrl: true, status: true,
                        modActions: { orderBy: { createdAt: 'desc' }, take: 20 },
                    },
                },
                report: {
                    include: {
                        reporter:   { select: { id: true, displayName: true, handle: true } },
                        modActions: { include: { moderator: { select: { id: true, displayName: true } } } },
                    },
                },
            },
        });

        if (!appeal) throw new AppError(404, 'Appeal not found');
        return appeal;
    }

    /**
     * Resolve an appeal.
     *  - ACCEPTED: reverses the linked ModAction (unban if banned, unsuspend if suspended)
     *  - REJECTED:  records the rejection reason only
     */
    async resolveAppeal(appealId: string, modId: string, decision: 'ACCEPTED' | 'REJECTED', notes?: string) {
        const appeal = await prisma.appeal.findUnique({
            where: { id: appealId },
            include: { report: { include: { modActions: { orderBy: { createdAt: 'desc' } } } } },
        });

        if (!appeal) throw new AppError(404, 'Appeal not found');
        if (appeal.status !== 'PENDING') throw new AppError(409, 'Appeal has already been resolved');

        // Update appeal record
        await prisma.appeal.update({
            where: { id: appealId },
            data:  { status: decision, reviewedBy: modId, reviewedAt: new Date() },
        });

        if (decision === 'ACCEPTED') {
            // Restore user to ACTIVE
            await prisma.user.update({
                where: { id: appeal.userId },
                data:  { status: 'ACTIVE' },
            });

            // Log an UNBAN action for audit trail
            await prisma.modAction.create({
                data: {
                    targetId: appeal.userId,
                    modId,
                    action:   'UNBAN',
                    reason:   `Appeal ${appealId} accepted${notes ? ': ' + notes : ''}`,
                },
            });

            // Update linked report to reflect appeal accepted
            await prisma.report.update({
                where: { id: appeal.reportId },
                data:  { status: 'APPEALED' as any },
            });

            // Notify the user their appeal was accepted
            await notificationsService.createNotification(appeal.userId, {
                type: 'APPEAL_ACCEPTED',
                title: '🎉 Your appeal has been accepted',
                body: `Your appeal was reviewed and accepted. Your account has been restored to good standing.${notes ? ' Moderator note: ' + notes : ''}`,
                metadata: { appealId, decision, notes },
            });
        } else {
            // Notify the user their appeal was rejected
            await notificationsService.createNotification(appeal.userId, {
                type: 'APPEAL_REJECTED',
                title: 'Your appeal has been rejected',
                body: `Your appeal was reviewed and rejected. The original action remains in effect.${notes ? ' Moderator note: ' + notes : ''}`,
                metadata: { appealId, decision, notes },
            });
        }

        return { message: `Appeal ${decision.toLowerCase()}`, appealId, userId: appeal.userId };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §4.4 — My Action History
    // ─────────────────────────────────────────────────────────────────────────

    async getMyActions(modId: string, params: { page: number; limit: number; action?: string }) {
        const { page, limit, action } = params;
        const skip = (page - 1) * limit;

        const where: any = { modId };
        if (action) where.action = action;

        const [actions, total] = await Promise.all([
            prisma.modAction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    target: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    report: { select: { id: true, category: true, status: true } },
                },
            }),
            prisma.modAction.count({ where }),
        ]);

        // Compute summary stats
        const allActions = await prisma.modAction.findMany({ where: { modId }, select: { action: true, createdAt: true } });
        const now        = new Date();
        const weekAgo    = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
        const monthAgo   = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const stats = {
            total:         allActions.length,
            thisWeek:      allActions.filter(a => a.createdAt >= weekAgo).length,
            thisMonth:     allActions.filter(a => a.createdAt >= monthAgo).length,
            warnings:      allActions.filter(a => a.action === 'WARNING').length,
            suspensions:   allActions.filter(a => a.action === 'SUSPENSION').length,
            bans:          allActions.filter(a => a.action === 'BAN').length,
            unbans:        allActions.filter(a => a.action === 'UNBAN').length,
            contentRemovals: allActions.filter(a => a.action === 'CONTENT_REMOVAL').length,
        };

        return { actions, total, page, limit, pages: Math.ceil(total / limit), stats };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §4.5 — User-facing: My Reports & Appeals
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns reports filed AGAINST this user (so they can see their moderation
     * history and check if they have grounds to appeal).
     * Includes any linked appeal record.
     */
    async getMyReceivedReports(userId: string, params: { page: number; limit: number }) {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where: { reportedId: userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    modActions: {
                        orderBy: { createdAt: 'desc' },
                        select: { id: true, action: true, reason: true, duration: true, expiresAt: true, createdAt: true },
                    },
                    appeal: {
                        select: { id: true, status: true, reason: true, createdAt: true, reviewedAt: true },
                    },
                },
            }),
            prisma.report.count({ where: { reportedId: userId } }),
        ]);

        // Strip reporter identity from the results — user only sees category/status
        const sanitized = reports.map(r => ({
            id:          r.id,
            category:    r.category,
            status:      r.status,
            contextType: r.contextType,
            createdAt:   r.createdAt,
            resolvedAt:  r.resolvedAt,
            modActions:  r.modActions,
            appeal:      r.appeal,
        }));

        return { reports: sanitized, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /**
     * Returns reports filed BY this user so they can track their own submissions.
     */
    async getMyFiledReports(userId: string, params: { page: number; limit: number }) {
        const { page, limit } = params;
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where: { reporterId: userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    reported: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                },
            }),
            prisma.report.count({ where: { reporterId: userId } }),
        ]);

        return { reports, total, page, limit, pages: Math.ceil(total / limit) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §4.6 — What Moderators CANNOT see is enforced by restrictTo('ADMIN')
    //         on all admin.routes.ts endpoints. No code needed here.
    // ─────────────────────────────────────────────────────────────────────────
}
