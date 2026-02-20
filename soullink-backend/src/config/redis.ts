import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../shared/utils/logger.js';

const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
});

redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', (err: any) => logger.error('Redis Error:', err));

export { redis };
