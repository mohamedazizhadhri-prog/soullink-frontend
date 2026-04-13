import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { aiService } from './ai.service.js';
import { logger } from '../../shared/utils/logger.js';

export const startAICronJobs = () => {
    logger.info('[AI-CRON] Initializing AI background tasks...');

    // Proactive message check every hour
    cron.schedule('0 * * * *', async () => {
        logger.info('[AI-CRON] Starting proactive check...');
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

            const staleConversations = await prisma.aIConversation.findMany({
                where: { updatedAt: { lt: threeDaysAgo } },
                take: 10
            });

            for (const conv of staleConversations) {
                await aiService.generateProactiveMessage(conv.userId, 'absence');
            }
        } catch (error) {
            logger.error('[AI-CRON] Error in proactive check:', error);
        }
    });
};
