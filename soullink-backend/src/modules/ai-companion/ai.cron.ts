import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { aiService } from './ai.service.js';
import { memoryService } from './memory.service.js';
import { logger } from '../../shared/utils/logger.js';
import { io } from '../../server.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emitProactive(userId: string, message: string, mood = 'neutral') {
    io.to(`user:${userId}`).emit('nova:proactive', { message, mood });
}

async function getRecentActiveUsers(hoursAgo: number): Promise<string[]> {
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const conversations = await prisma.aIConversation.findMany({
        where: {
            updatedAt: { gte: since },
            messages: { some: { role: 'user' } },
        },
        select: { userId: true },
        take: 20,
    });
    return [...new Set(conversations.map((c) => c.userId))];
}

// ─── Cron Jobs ───────────────────────────────────────────────────────────────

export const startAICronJobs = () => {
    logger.info('[AI-CRON] Initializing AI background tasks...');

    // ── Absence check: every hour ─────────────────────────────────────────────
    cron.schedule('0 * * * *', async () => {
        logger.info('[AI-CRON] Running absence check...');
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const staleConversations = await prisma.aIConversation.findMany({
                where: { updatedAt: { lt: threeDaysAgo } },
                take: 10,
            });
            for (const conv of staleConversations) {
                const msg = await aiService.generateProactiveMessage(conv.userId, 'absence');
                if (msg) emitProactive(conv.userId, msg);
            }
        } catch (error) {
            logger.error('[AI-CRON] Absence check error:', error);
        }
    });

    // ── Morning check-in: 8 AM daily ─────────────────────────────────────────
    cron.schedule('0 8 * * *', async () => {
        logger.info('[AI-CRON] Running morning check-in...');
        try {
            const activeUsers = await getRecentActiveUsers(24);
            for (const userId of activeUsers) {
                const msg = await aiService.generateProactiveMessage(userId, 'morning');
                if (msg) {
                    emitProactive(userId, msg);
                    memoryService.recordTrustEvent(userId, 'daily_checkin').catch(() => {});
                }
            }
        } catch (error) {
            logger.error('[AI-CRON] Morning check-in error:', error);
        }
    });

    // ── Night check-in: 10 PM daily ──────────────────────────────────────────
    cron.schedule('0 22 * * *', async () => {
        logger.info('[AI-CRON] Running night check-in...');
        try {
            const activeUsers = await getRecentActiveUsers(24);
            for (const userId of activeUsers) {
                const msg = await aiService.generateProactiveMessage(userId, 'night');
                if (msg) {
                    emitProactive(userId, msg);
                    memoryService.recordTrustEvent(userId, 'daily_checkin').catch(() => {});
                }
            }
        } catch (error) {
            logger.error('[AI-CRON] Night check-in error:', error);
        }
    });

    // ── Random personality-aware: every 6 hours ───────────────────────────────
    cron.schedule('0 */6 * * *', async () => {
        logger.info('[AI-CRON] Running random proactive...');
        try {
            const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
            const candidates = await prisma.user.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true },
                take: 15,
            });
            for (const user of candidates) {
                const lastProactive = await prisma.aIMessage.findFirst({
                    where: { conversation: { userId: user.id }, isProactive: true },
                    orderBy: { createdAt: 'desc' },
                });
                if (lastProactive && lastProactive.createdAt > threeHoursAgo) continue;
                const msg = await aiService.generateProactiveMessage(user.id, 'random');
                if (msg) emitProactive(user.id, msg);
            }
        } catch (error) {
            logger.error('[AI-CRON] Random proactive error:', error);
        }
    });

    // ── Account anniversary: daily at noon ───────────────────────────────────
    cron.schedule('0 12 * * *', async () => {
        logger.info('[AI-CRON] Running anniversary check...');
        try {
            const today = new Date();
            const users = await prisma.user.findMany({
                where: { status: 'ACTIVE' },
                select: { id: true, createdAt: true },
            });
            for (const user of users) {
                const created = new Date(user.createdAt);
                const isAnniversary =
                    created.getMonth() === today.getMonth() &&
                    created.getDate() === today.getDate() &&
                    created.getFullYear() !== today.getFullYear();

                if (!isAnniversary) continue;
                const daysSince = Math.round((today.getTime() - created.getTime()) / 86400000);
                const result = await aiService.generateEventResponse(user.id, 'anniversary', { daysSince });
                if (result) emitProactive(user.id, result.response, result.mood);
            }
        } catch (error) {
            logger.error('[AI-CRON] Anniversary check error:', error);
        }
    });
};

