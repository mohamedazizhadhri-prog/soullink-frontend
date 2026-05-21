/**
 * Usage Tracker — External Service Credit Logger
 *
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §5.7 & §6 Phase 4
 *
 * Polls real usage data from external service APIs:
 *   - ElevenLabs: GET /v1/user/subscription → character usage
 *   - Cloudinary:  GET /v1_1/{cloud}/usage  → storage/bandwidth
 *   - Pinecone:    SDK describeIndexStats   → vector count
 *
 * Also tracks: GROQ, COHERE, SENDMATOR, SMTP via manual increments.
 *
 * Schedule: every 15 minutes + on server startup.
 */

import cron from 'node-cron';
import { Pinecone } from '@pinecone-database/pinecone';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../shared/utils/logger.js';

// Free-tier limits per service (used for percentage calculation & manual-increment services)
const LIMITS: Record<string, { metric: string; limit: number }> = {
    GROQ:                  { metric: 'tokens',     limit: 500_000 },  // tokens/day (Groq free)
    COHERE:                { metric: 'calls',      limit: 1_000   },  // calls/month
    PINECONE:              { metric: 'vectors',    limit: 100_000 },  // vectors/index
    ELEVENLABS:            { metric: 'characters', limit: 10_000  },  // chars/month
    SENDMATOR:             { metric: 'emails',     limit: 500     },  // emails/day
    CLOUDINARY_CREDITS:    { metric: 'credits',    limit: 25      },  // credits/month
    CLOUDINARY_STORAGE:    { metric: 'mb',         limit: 25_000  },  // MB total
    CLOUDINARY_BANDWIDTH:  { metric: 'mb',         limit: 25_000  },  // MB bandwidth
    CLOUDINARY_TRANSFORMS: { metric: 'transforms', limit: 25_000  },  // transforms/month
    SMTP:                  { metric: 'emails',     limit: 500     },  // emails/day
};

// ─────────────────────────────────────────────────────────────────────────────
// Upsert helper — writes a service usage record for today
// ─────────────────────────────────────────────────────────────────────────────

async function upsertUsage(service: string, metric: string, value: number, limit: number) {
    const today      = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const percentage = limit > 0 ? (value / limit) * 100 : 0;

    try {
        const existing = await prisma.serviceUsageLog.findFirst({
            where: {
                service,
                metric,
                recordedAt: { gte: todayStart, lt: todayEnd },
            },
        });

        if (existing) {
            await prisma.serviceUsageLog.update({
                where: { id: existing.id },
                data:  { value, limit, percentage },
            });
        } else {
            await prisma.serviceUsageLog.create({
                data: { service, metric, value, limit, percentage },
            });
        }
    } catch (err) {
        logger.error(`[UsageTracker] Failed to upsert ${service}.${metric}:`, err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// §1 — ElevenLabs: GET /v1/user/subscription
// ─────────────────────────────────────────────────────────────────────────────

async function pollElevenLabs() {
    if (!env.ELEVENLABS_API_KEY) {
        logger.warn('[UsageTracker] ELEVENLABS_API_KEY not set, skipping');
        return;
    }

    try {
        const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
        });

        if (!res.ok) {
            logger.error(`[UsageTracker] ElevenLabs API returned ${res.status}`);
            return;
        }

        const data = await res.json() as any;
        const used  = data.character_count ?? 0;
        const limit = data.character_limit ?? 10_000;

        await upsertUsage('ELEVENLABS', 'characters', used, limit);
        logger.info(`[UsageTracker] ElevenLabs: ${used}/${limit} characters`);
    } catch (err) {
        logger.error('[UsageTracker] ElevenLabs poll failed:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 — Cloudinary: GET /v1_1/{cloud}/usage
// ─────────────────────────────────────────────────────────────────────────────

async function pollCloudinary() {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        logger.warn('[UsageTracker] Cloudinary credentials not set, skipping');
        return;
    }

    try {
        const basicAuth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/usage`,
            { headers: { Authorization: `Basic ${basicAuth}` } },
        );

        if (!res.ok) {
            logger.error(`[UsageTracker] Cloudinary API returned ${res.status}`);
            return;
        }

        const data = await res.json() as any;

        // 1. Storage (MB)
        const storageUsed  = data.storage?.usage ?? 0;
        const storageMB    = Math.round(storageUsed / (1024 * 1024));
        const storageLimit = data.storage?.limit  
            ? Math.round(data.storage.limit / (1024 * 1024)) 
            : 25_000;
        await upsertUsage('CLOUDINARY_STORAGE', 'mb', storageMB, storageLimit);

        // 2. Bandwidth (MB)
        const bwUsed  = data.bandwidth?.usage ?? 0;
        const bwMB    = Math.round(bwUsed / (1024 * 1024));
        const bwLimit = data.bandwidth?.limit 
            ? Math.round(data.bandwidth.limit / (1024 * 1024)) 
            : 25_000;
        await upsertUsage('CLOUDINARY_BANDWIDTH', 'mb', bwMB, bwLimit);

        // 3. Transformations (Count)
        const txUsed  = data.transformations?.usage ?? 0;
        const txLimit = data.transformations?.limit ?? 25_000;
        await upsertUsage('CLOUDINARY_TRANSFORMS', 'transforms', txUsed, txLimit);

        // 4. Total Credits (The true burn metric)
        if (data.credits) {
            const creditsUsed  = data.credits.usage ?? 0;
            const creditsLimit = data.credits.limit ?? 25;
            await upsertUsage('CLOUDINARY_CREDITS', 'credits', creditsUsed, creditsLimit);
        }

        logger.info(`[UsageTracker] Cloudinary: credits=${data.credits?.usage}, storage=${storageMB}MB, bandwidth=${bwMB}MB`);
    } catch (err) {
        logger.error('[UsageTracker] Cloudinary poll failed:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 — Pinecone: describeIndexStats via SDK
// ─────────────────────────────────────────────────────────────────────────────

async function pollPinecone() {
    if (!env.PINECONE_API_KEY) {
        logger.warn('[UsageTracker] PINECONE_API_KEY not set, skipping');
        return;
    }

    try {
        const pc    = new Pinecone({ apiKey: env.PINECONE_API_KEY });
        const index = pc.index(env.PINECONE_INDEX_NAME);
        const stats = await index.describeIndexStats();

        const vectorCount = stats.totalRecordCount ?? 0;
        const limit       = LIMITS.PINECONE.limit; // 100k for free tier

        await upsertUsage('PINECONE', 'vectors', vectorCount, limit);
        logger.info(`[UsageTracker] Pinecone: ${vectorCount}/${limit} vectors`);
    } catch (err) {
        logger.error('[UsageTracker] Pinecone poll failed:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual increment helper (for GROQ, COHERE, SMTP, SENDMATOR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Programmatic increment helper.
 * Call this from any service that uses an external API:
 *   await UsageTrackerService.increment('GROQ', 'requests', 1);
 */
export class UsageTrackerService {
    static async increment(serviceName: string, metric: string, count = 1) {
        const serviceConfig = LIMITS[serviceName];
        if (!serviceConfig) {
            logger.warn(`Unknown service for tracking: ${serviceName}`);
            return;
        }

        const today     = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        try {
            const existing = await prisma.serviceUsageLog.findFirst({
                where: {
                    service:    serviceName,
                    metric,
                    recordedAt: { gte: todayStart, lt: todayEnd },
                },
            });

            const newValue      = (existing?.value ?? 0) + count;
            const limit         = serviceConfig.limit;
            const percentage    = (newValue / limit) * 100;

            if (existing) {
                await prisma.serviceUsageLog.update({
                    where: { id: existing.id },
                    data:  { value: newValue, percentage },
                });
            } else {
                await prisma.serviceUsageLog.create({
                    data: {
                        service:    serviceName,
                        metric,
                        value:      newValue,
                        limit,
                        percentage,
                    },
                });
            }
        } catch (error) {
            logger.error(`Failed to increment usage for ${serviceName}.${metric}:`, error);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Master poll function — calls all 3 API pollers
// ─────────────────────────────────────────────────────────────────────────────

export async function pollAllExternalServices() {
    logger.info('[UsageTracker] Polling external service APIs...');
    await Promise.allSettled([
        pollElevenLabs(),
        pollCloudinary(),
        pollPinecone(),
    ]);
    logger.info('[UsageTracker] External service polling complete.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Midnight baseline + 15-minute polling cron
// ─────────────────────────────────────────────────────────────────────────────

export const startUsageTrackerCron = () => {
    // Midnight: ensure baseline zero rows exist for manual-increment services
    cron.schedule('0 0 * * *', async () => {
        logger.info('Cron: usageTracker — initializing daily baseline records');

        for (const [service, config] of Object.entries(LIMITS)) {
            const today    = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

            try {
                const existing = await prisma.serviceUsageLog.findFirst({
                    where: {
                        service,
                        metric:     config.metric,
                        recordedAt: { gte: todayStart, lt: todayEnd },
                    },
                });

                if (!existing) {
                    await prisma.serviceUsageLog.create({
                        data: {
                            service,
                            metric:     config.metric,
                            value:      0,
                            limit:      config.limit,
                            percentage: 0,
                        },
                    });
                    logger.info(`Cron: created baseline record for ${service}`);
                }
            } catch (err) {
                logger.error(`Cron: failed to baseline ${service}:`, err);
            }
        }

        logger.info('Cron: usageTracker — baseline initialization complete');
    }, { timezone: 'UTC' });

    // Every 15 minutes: poll ElevenLabs, Cloudinary, Pinecone for real data
    cron.schedule('*/15 * * * *', async () => {
        await pollAllExternalServices();
    }, { timezone: 'UTC' });

    // Immediate poll on startup so dashboard shows data right away
    setTimeout(() => {
        pollAllExternalServices().catch(err => {
            logger.error('[UsageTracker] Startup poll failed:', err);
        });
    }, 5000); // slight delay to let DB connection establish
};
