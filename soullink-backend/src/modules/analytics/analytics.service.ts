/**
 * AnalyticsService — Full 6-Domain Analytics Layer
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §5
 * CDC: EF-058 → EF-066
 *
 * Domains:
 *  §5.1 User Analytics
 *  §5.2 Matching Analytics
 *  §5.3 Soul Games Analytics
 *  §5.4 Nova AI Analytics
 *  §5.5 Communication & Community Analytics
 *  §5.6 Security & Moderation Analytics
 *  §5.7 External Service Credit Tracking
 */

import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const cutoffDate = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const todayMidnight = () => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

export class AnalyticsService {

    // ─────────────────────────────────────────────────────────────────────────
    // §5.1 — User Analytics (CDC EF-059)
    // ─────────────────────────────────────────────────────────────────────────

    async getUserAnalytics(days = 30) {
        const cutoff  = cutoffDate(days);
        const weekAgo = cutoffDate(7);

        const [
            totalUsers,
            newUsers,
            activeUsers,
            weeklyActive,
            statusCounts,
            verificationFunnel,
            timezones,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: cutoff } } }),
            prisma.user.count({ where: { lastLoginAt: { gte: cutoff } } }),
            prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),

            // Account status breakdown
            prisma.user.groupBy({
                by: ['status'],
                _count: { id: true },
            }),

            // Verification funnel: step-by-step drop-off
            Promise.all([
                prisma.user.count(), // total registered
                prisma.user.count({ where: { emailVerified: true } }),
                prisma.user.count({ where: { phoneVerified: true } }),
                prisma.user.count({ where: { faceVerified: true } }),
                prisma.user.count({ where: { status: { in: ['ACTIVE', 'SUSPENDED', 'BANNED'] } } }), // completed soul game
            ]),

            // Top timezones
            prisma.user.groupBy({
                by: ['timezone'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
                where: { timezone: { not: null } },
            }),
        ]);

        const retentionRate = totalUsers > 0
            ? ((activeUsers / totalUsers) * 100).toFixed(2)
            : '0';

        return {
            totals: { totalUsers, newUsers, activeUsers, weeklyActive },
            retentionRate,
            statusBreakdown: statusCounts.map(s => ({ status: s.status, count: s._count.id })),
            verificationFunnel: {
                registered:    verificationFunnel[0],
                emailVerified: verificationFunnel[1],
                phoneVerified: verificationFunnel[2],
                faceVerified:  verificationFunnel[3],
                soulCompleted: verificationFunnel[4],
            },
            topTimezones: timezones
                .filter(t => t.timezone)
                .map(t => ({ timezone: t.timezone!, count: t._count.id })),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §5.2 — Matching Analytics (CDC EF-060)
    // ─────────────────────────────────────────────────────────────────────────

    async getMatchingAnalytics(days = 30) {
        const cutoff = cutoffDate(days);

        const [
            totalMatches,
            matchStatusCounts,
            avgCompatibility,
            matchTypeCounts,
            identityRevealedCount,
            intentDistribution,
            suggestionStatusCounts,
            expiredSuggestions,
        ] = await Promise.all([
            prisma.match.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.match.groupBy({
                by: ['status'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.match.aggregate({
                _avg: { compatibilityScore: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.match.groupBy({
                by: ['type'],
                _count: { id: true },
            }),

            prisma.match.count({
                where: { identityRevealed: true, createdAt: { gte: cutoff } },
            }),

            prisma.matchPreference.groupBy({
                by: ['intent'],
                _count: { id: true },
            }),

            prisma.matchSuggestion.groupBy({
                by: ['status'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.matchSuggestion.count({
                where: { status: 'EXPIRED', createdAt: { gte: cutoff } },
            }),
        ]);

        const accepted = matchStatusCounts.find(s => s.status === 'ACCEPTED')?._count.id ?? 0;
        const acceptanceRate = totalMatches > 0
            ? ((accepted / totalMatches) * 100).toFixed(2)
            : '0';

        return {
            totals: { totalMatches, accepted, acceptanceRate },
            avgCompatibilityScore: avgCompatibility._avg.compatibilityScore?.toFixed(3) ?? '0',
            identityRevealedCount,
            statusBreakdown:    matchStatusCounts.map(s => ({ status: s.status, count: s._count.id })),
            typeBreakdown:      matchTypeCounts.map(t => ({ type: t.type, count: t._count.id })),
            intentDistribution: intentDistribution.map(i => ({ intent: i.intent, count: i._count.id })),
            suggestionFunnel: {
                byStatus:      suggestionStatusCounts.map(s => ({ status: s.status, count: s._count.id })),
                expiredCount:  expiredSuggestions,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §5.3 — Soul Games Analytics (CDC EF-058)
    // ─────────────────────────────────────────────────────────────────────────

    async getSoulGamesAnalytics() {
        const [
            games,
            progressStats,
            responseStats,
            emotionalNotes,
        ] = await Promise.all([
            // All games with completion counts
            prisma.soulGame.findMany({
                select: {
                    id: true, title: true, episode: true, isActive: true,
                    _count: { select: { progress: true, responses: true } },
                },
                orderBy: { episode: 'asc' },
            }),

            // Completion breakdown per game
            prisma.soulGameProgress.groupBy({
                by: ['gameId', 'isCompleted'],
                _count: { id: true },
            }),

            // Avg response time per game (how fast users answer scenes)
            prisma.gameResponse.groupBy({
                by: ['gameId'],
                _avg: { responseTimeMs: true },
                _count: { id: true },
            }),

            // Emotional note frequency
            prisma.gameResponse.findMany({
                where:  { emotionalNote: { not: null } },
                select: { emotionalNote: true },
            }),
        ]);

        // Build completion rate per game
        const completionMap: Record<string, { started: number; completed: number }> = {};
        for (const p of progressStats) {
            if (!completionMap[p.gameId]) completionMap[p.gameId] = { started: 0, completed: 0 };
            completionMap[p.gameId].started   += p._count.id;
            if (p.isCompleted) completionMap[p.gameId].completed += p._count.id;
        }

        // Emotion frequency tally
        const emotionFreq: Record<string, number> = {};
        for (const r of emotionalNotes) {
            if (r.emotionalNote) {
                emotionFreq[r.emotionalNote] = (emotionFreq[r.emotionalNote] ?? 0) + 1;
            }
        }

        return {
            games: games.map(g => ({
                id: g.id, title: g.title, episode: g.episode, isActive: g.isActive,
                totalStarts:    completionMap[g.id]?.started   ?? 0,
                totalCompletes: completionMap[g.id]?.completed ?? 0,
                completionRate: completionMap[g.id]?.started > 0
                    ? ((completionMap[g.id].completed / completionMap[g.id].started) * 100).toFixed(1) + '%'
                    : '0%',
                totalResponses: g._count.responses,
            })),
            responseStats: responseStats.map(r => ({
                gameId: r.gameId,
                avgResponseMs: r._avg.responseTimeMs?.toFixed(0) ?? '0',
                totalResponses: r._count.id,
            })),
            emotionFrequency: Object.entries(emotionFreq)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 15)
                .map(([emotion, count]) => ({ emotion, count })),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §5.4 — Nova AI Analytics (CDC EF-061)
    // ─────────────────────────────────────────────────────────────────────────

    async getNovaAnalytics(days = 30) {
        const cutoff = cutoffDate(days);

        const [
            totalConversations,
            newConversations,
            totalMessages,
            proactiveMessages,
            emotionBreakdown,
            trustLevelDist,
            friendshipStageDist,
            todayCredits,
        ] = await Promise.all([
            prisma.aIConversation.count(),
            prisma.aIConversation.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.aIMessage.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.aIMessage.count({
                where: { isProactive: true, createdAt: { gte: cutoff } },
            }),

            // Emotion detected breakdown
            prisma.aIMessage.groupBy({
                by: ['emotionDetected'],
                _count: { id: true },
                where: { emotionDetected: { not: null }, createdAt: { gte: cutoff } },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            }),

            // Trust level distribution (0–10)
            prisma.novaUserMemory.groupBy({
                by: ['trustLevel'],
                _count: { id: true },
                orderBy: { trustLevel: 'asc' },
            }),

            // Friendship stage breakdown
            prisma.novaUserMemory.groupBy({
                by: ['friendshipStage'],
                _count: { id: true },
            }),

            // Today's credit usage for AI services
            (async () => {
                const today      = new Date();
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
                const logs = await prisma.serviceUsageLog.findMany({
                    where: {
                        service:    { in: ['GROQ', 'COHERE', 'PINECONE', 'ELEVENLABS'] },
                        recordedAt: { gte: todayStart, lt: todayEnd },
                    },
                });
                const byService: Record<string, number> = {};
                for (const l of logs) {
                    if (!(l.service in byService)) byService[l.service] = l.value;
                }
                return byService;
            })(),
        ]);

        const proactiveRate = totalMessages > 0
            ? ((proactiveMessages / totalMessages) * 100).toFixed(2)
            : '0';

        return {
            conversations: {
                total:  totalConversations,
                newInPeriod: newConversations,
            },
            messages: {
                total: totalMessages,
                proactive: proactiveMessages,
                proactiveRate: proactiveRate + '%',
            },
            emotionBreakdown: emotionBreakdown.map(e => ({
                emotion: e.emotionDetected ?? 'unknown',
                count:   e._count.id,
            })),
            trustLevelDistribution: trustLevelDist.map(t => ({
                level: t.trustLevel,
                count: t._count.id,
            })),
            friendshipStageDistribution: friendshipStageDist.map(f => ({
                stage: f.friendshipStage,
                count: f._count.id,
            })),
            todayAPIUsage: {
                groq:       todayCredits['GROQ']       ?? 0,
                cohere:     todayCredits['COHERE']     ?? 0,
                pinecone:   todayCredits['PINECONE']   ?? 0,
                elevenlabs: todayCredits['ELEVENLABS'] ?? 0,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §5.5 — Communication & Community Analytics (CDC EF-060)
    // ─────────────────────────────────────────────────────────────────────────

    async getCommunicationAnalytics(days = 30) {
        const cutoff = cutoffDate(days);

        const [
            dmCount,
            channelMsgCount,
            matchMsgCount,
            totalServers,
            activeServers,
            avgMembersPerServer,
            msgTypeBreakdown,
            channelTypeBreakdown,
            friendshipStats,
            serverBansCount,
            serverMutesCount,
        ] = await Promise.all([
            prisma.directMessage.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.message.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.matchMessage.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.server.count(),

            // Servers with at least 1 message recently (proxy for "active")
            prisma.server.count({
                where: {
                    channels: {
                        some: {
                            messages: { some: { createdAt: { gte: cutoff } } },
                        },
                    },
                },
            }),

            prisma.serverMember.groupBy({
                by: ['serverId'],
                _count: { id: true },
            }),

            // Message type distribution across DMs
            prisma.directMessage.groupBy({
                by: ['type'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            // Channel type breakdown
            prisma.channel.groupBy({
                by: ['type'],
                _count: { id: true },
            }),

            // Friendship request funnel
            prisma.friendship.groupBy({
                by: ['status'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.serverBan.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.serverMute.count({ where: { createdAt: { gte: cutoff } } }),
        ]);

        const memberCounts = avgMembersPerServer.map(s => s._count.id);
        const avgMembers = memberCounts.length > 0
            ? (memberCounts.reduce((a, b) => a + b, 0) / memberCounts.length).toFixed(1)
            : '0';

        return {
            messages: {
                directMessages:  dmCount,
                channelMessages: channelMsgCount,
                matchMessages:   matchMsgCount,
                total: dmCount + channelMsgCount + matchMsgCount,
            },
            communities: {
                total:          totalServers,
                active:         activeServers,
                avgMembersPerServer: avgMembers,
            },
            messageTypeBreakdown: msgTypeBreakdown.map(m => ({ type: m.type, count: m._count.id })),
            channelTypeBreakdown: channelTypeBreakdown.map(c => ({ type: c.type, count: c._count.id })),
            friendshipFunnel:     friendshipStats.map(f => ({ status: f.status, count: f._count.id })),
            serverActions: {
                bans:  serverBansCount,
                mutes: serverMutesCount,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §5.6 — Security & Moderation Analytics (CDC EF-062, EF-071)
    // ─────────────────────────────────────────────────────────────────────────

    async getModerationAnalytics(days = 30) {
        const cutoff = cutoffDate(days);

        const [
            totalReports,
            resolvedReports,
            reportStatusDist,
            reportCategoryDist,
            modActionTypeDist,
            totalAppeals,
            acceptedAppeals,
            bannedUsers,
            blacklistedTokens,
            loginFailures,
            avgResolutionTime,
        ] = await Promise.all([
            prisma.report.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.report.count({
                where: {
                    createdAt: { gte: cutoff },
                    status: { in: ['RESOLVED_WARNING', 'RESOLVED_SUSPENSION', 'RESOLVED_BAN', 'DISMISSED'] },
                },
            }),

            prisma.report.groupBy({
                by: ['status'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.report.groupBy({
                by: ['category'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.modAction.groupBy({
                by: ['action'],
                _count: { id: true },
                where: { createdAt: { gte: cutoff } },
            }),

            prisma.appeal.count({ where: { createdAt: { gte: cutoff } } }),

            prisma.appeal.count({
                where: { status: 'ACCEPTED', createdAt: { gte: cutoff } },
            }),

            prisma.user.count({ where: { status: 'BANNED' } }),

            prisma.tokenBlacklist.count(),

            prisma.loginHistory.count({
                where: { success: false, createdAt: { gte: cutoff } },
            }),

            // Average time to resolve (resolvedAt - createdAt in ms)
            prisma.report.findMany({
                where: {
                    resolvedAt: { not: null },
                    createdAt: { gte: cutoff },
                },
                select: { createdAt: true, resolvedAt: true },
            }),
        ]);

        const resolutionRate = totalReports > 0
            ? ((resolvedReports / totalReports) * 100).toFixed(2)
            : '0';

        const appealWinRate = totalAppeals > 0
            ? ((acceptedAppeals / totalAppeals) * 100).toFixed(2)
            : '0';

        const avgResMs = avgResolutionTime.length > 0
            ? (avgResolutionTime.reduce((sum, r) => {
                return sum + (r.resolvedAt!.getTime() - r.createdAt.getTime());
              }, 0) / avgResolutionTime.length / (1000 * 60 * 60)).toFixed(1) // in hours
            : '0';

        return {
            reports: {
                total:          totalReports,
                resolved:       resolvedReports,
                resolutionRate: resolutionRate + '%',
                avgResolutionHours: avgResMs,
            },
            reportStatusDistribution:   reportStatusDist.map(s => ({ status: s.status,     count: s._count.id })),
            reportCategoryDistribution: reportCategoryDist.map(c => ({ category: c.category, count: c._count.id })),
            modActionBreakdown:          modActionTypeDist.map(a => ({ action: a.action,    count: a._count.id })),
            appeals: {
                total:      totalAppeals,
                accepted:   acceptedAppeals,
                winRate:    appealWinRate + '%',
            },
            platform: {
                bannedUsers,
                blacklistedTokens,
                loginFailures,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §5.7 — External Service Credit Tracking (CDC EF-063)
    // ─────────────────────────────────────────────────────────────────────────

    async getCreditUsage() {
        const today      = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // Fallback limits (only used if DB record has no limit)
        const FALLBACK_LIMITS: Record<string, number> = {
            GROQ:                  500_000,
            COHERE:                1_000,
            PINECONE:              100_000,
            ELEVENLABS:            10_000,
            SENDMATOR:             500,
            CLOUDINARY_CREDITS:    25,
            CLOUDINARY_STORAGE:    25_000,
            CLOUDINARY_BANDWIDTH:  25_000,
            CLOUDINARY_TRANSFORMS: 25_000,
            SMTP:                  500,
        };

        // Services we want to display
        const SERVICES = Object.keys(FALLBACK_LIMITS);

        // Get the latest record per service from today
        const usageLogs = await prisma.serviceUsageLog.findMany({
            where: { recordedAt: { gte: todayStart, lt: todayEnd } },
            orderBy: { recordedAt: 'desc' },
        });

        // Collapse to most recent record per service (keeps both value AND real limit)
        const latestByService: Record<string, { value: number; limit: number | null }> = {};
        for (const log of usageLogs) {
            if (!(log.service in latestByService)) {
                latestByService[log.service] = { value: log.value, limit: log.limit };
            }
        }

        return SERVICES.map(service => {
            const record = latestByService[service];
            const used   = record?.value ?? 0;
            const limit  = record?.limit ?? FALLBACK_LIMITS[service] ?? 0;
            const pct    = limit > 0 ? (used / limit) * 100 : 0;
            return {
                service,
                used,
                limit,
                percentage: pct.toFixed(2),
                status: pct >= 80 ? 'DANGER' : pct >= 60 ? 'WARNING' : 'OK',
            };
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // §3.1 — Overview KPI Snapshot (for the /admin landing card row)
    // Reads from AnalyticsSnapshot if today's snapshot exists, else live counts
    // ─────────────────────────────────────────────────────────────────────────

    async getSystemAnalytics(days = 30) {
        const cutoff  = cutoffDate(days);

        // Try to get today's snapshot first
        const today = todayMidnight();
        const snapshot = await prisma.analyticsSnapshot.findUnique({
            where: { date: today },
        });

        if (snapshot) {
            return {
                source: 'snapshot',
                users: {
                    total:        snapshot.totalUsers,
                    newInPeriod:  snapshot.newUsers,
                    activeInPeriod: snapshot.activeUsers,
                    retentionRate: snapshot.retentionRate.toFixed(2),
                },
                matching: {
                    totalMatches:     snapshot.totalMatches,
                    successfulMatches: snapshot.successfulMatches,
                    avgMatchScore:    snapshot.avgMatchScore.toFixed(3),
                },
                communication: {
                    totalMessages: snapshot.totalMessages,
                },
                moderation: {
                    totalReports:    snapshot.totalReports,
                    resolvedReports: snapshot.resolvedReports,
                    pendingReports:  snapshot.totalReports - snapshot.resolvedReports,
                },
            };
        }

        // Fallback: live counts
        const [totalUsers, newUsers, activeUsers, totalMatches, pendingReports, appeals] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt:   { gte: cutoff } } }),
            prisma.user.count({ where: { lastLoginAt: { gte: cutoff } } }),
            prisma.match.count(),
            prisma.report.count({ where: { status: 'PENDING' } }),
            prisma.appeal.count({ where: { status: 'PENDING' } }),
        ]);

        return {
            source: 'live',
            users: {
                total:         totalUsers,
                newInPeriod:   newUsers,
                activeInPeriod: activeUsers,
                retentionRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : '0',
            },
            matching:      { totalMatches, successfulMatches: 0, avgMatchScore: '0' },
            communication: { totalMessages: 0 },
            moderation:    { totalReports: 0, resolvedReports: 0, pendingReports, appeals },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cron: Snapshot today's platform KPIs into AnalyticsSnapshot
    // Called by the midnight cron job
    // ─────────────────────────────────────────────────────────────────────────

    async snapshotPlatformAnalytics() {
        try {
            const today   = todayMidnight();
            const weekAgo = cutoffDate(7);

            const [totalUsers, activeUsers, newUsers, totalMatches, successfulMatches, totalMessages, totalReports, resolvedReports, avgScoreAgg] =
                await Promise.all([
                    prisma.user.count(),
                    prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
                    prisma.user.count({ where: { createdAt: { gte: cutoffDate(1) } } }),
                    prisma.match.count(),
                    prisma.match.count({ where: { status: 'ACCEPTED' } }),
                    prisma.message.count(),
                    prisma.report.count(),
                    prisma.report.count({ where: { status: { in: ['RESOLVED_WARNING', 'RESOLVED_SUSPENSION', 'RESOLVED_BAN', 'DISMISSED'] } } }),
                    prisma.match.aggregate({ _avg: { compatibilityScore: true } }),
                ]);

            await prisma.analyticsSnapshot.upsert({
                where: { date: today },
                update: {
                    totalUsers, activeUsers, newUsers,
                    totalMatches, successfulMatches,
                    totalMessages, totalReports, resolvedReports,
                    avgMatchScore: avgScoreAgg._avg.compatibilityScore ?? 0,
                    retentionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
                },
                create: {
                    date: today,
                    totalUsers, activeUsers, newUsers,
                    totalMatches, successfulMatches,
                    totalMessages, totalReports, resolvedReports,
                    avgMatchScore: avgScoreAgg._avg.compatibilityScore ?? 0,
                    retentionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
                },
            });

            logger.info('AnalyticsSnapshot: Platform KPI snapshot written for ' + today.toISOString());
        } catch (err) {
            logger.error('snapshotPlatformAnalytics failed:', err);
        }
    }
}
