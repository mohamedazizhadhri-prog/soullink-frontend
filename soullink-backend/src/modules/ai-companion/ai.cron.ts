import cron from 'node-cron';
import { prisma } from '../../config/database.js';
import { AIService } from './ai.service.js';
import { logger } from '../../shared/utils/logger.js';

const aiService = new AIService();

// Run every hour to check for inactive users
export const startAICronJobs = () => {
    logger.info('Starting AI Companion cron jobs...');

    cron.schedule('0 * * * *', async () => {
        logger.info('Running background check for proactive Nova messages (daily check-in)...');
        try {
            // Find users who have an AIConversation but no message in the last 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // We want to find conversations where the LATEST message is older than 24 hours
            // This is a bit complex in Prisma, so let's find all conversations,
            // get their latest message, and see if it's old.
            const staledConversations = await prisma.aIConversation.findMany({
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });

            const usersToPing: { userId: string, type: 'daily_checkin' | 'long_absence' }[] = [];

            for (const conv of staledConversations) {
                if (conv.messages.length > 0) {
                    const lastMsgTime = conv.messages[0].createdAt.getTime();
                    const hoursInactive = (Date.now() - lastMsgTime) / (1000 * 60 * 60);

                    // If inactive for more than 48 hours, it's a long absence.
                    // If exactly > 24 and <= 48, daily check-in.
                    // We also need to make sure we don't spam. So check if the LAST message was proactive.
                    const wasLastProactive = conv.messages[0].isProactive;

                    if (!wasLastProactive && hoursInactive > 24) {
                        usersToPing.push({
                            userId: conv.userId,
                            type: hoursInactive > 48 ? 'long_absence' : 'daily_checkin'
                        });
                    }
                }
            }

            // To avoid API rate limits, only pick up to 5 users to ping per tick
            const selectedPings = usersToPing.slice(0, 5);
            for (const ping of selectedPings) {
                await aiService.generateProactiveMessage(ping.userId, ping.type);
            }

        } catch (error) {
            logger.error('Error in AI cron job:', error);
        }
    });
};
