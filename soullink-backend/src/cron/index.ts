/**
 * Cron Job Bootstrap
 *
 * Imports and starts all background cron processors when the API launches.
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6 Phase 4
 */

import cron from 'node-cron';
import { logger } from '../shared/utils/logger.js';
import { startUsageTrackerCron } from './usageTracker.js';
import { AnalyticsService } from '../modules/analytics/analytics.service.js';

const analyticsService = new AnalyticsService();

export const startCronJobs = () => {
    logger.info('Initializing background cron jobs...');

    // §6 Phase 4: Midnight usage tracker — initializes ServiceUsageLog rows
    startUsageTrackerCron();

    // §6 Phase 4: Midnight KPI snapshot — writes to AnalyticsSnapshot model
    cron.schedule('5 0 * * *', async () => {
        logger.info('Running cron: snapshotPlatformAnalytics');
        await analyticsService.snapshotPlatformAnalytics();
    }, { timezone: 'UTC' });

    logger.info('Background cron jobs successfully scheduled.');
};
