import { server } from './server.js';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';
import { prisma } from './config/database.js';
import { startAICronJobs } from './modules/ai-companion/ai.cron.js';
const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        logger.info('Connected to PostgreSQL database');
        const port = env.PORT;
        server.listen(port, () => {
            logger.info(`SoulLink Backend running in ${env.NODE_ENV} mode on port ${port}`);
            // Start background tasks
            startAICronJobs();
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
