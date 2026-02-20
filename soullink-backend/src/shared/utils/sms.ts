import twilio from 'twilio';
import { env } from '../../config/env.js';
import { logger } from './logger.js';

const client = twilio(env.TWILIO_SID, env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (to: string, body: string) => {
    try {
        if (env.NODE_ENV === 'development') {
            logger.info(`[SMS MOCK] To: ${to}, Message: ${body}`);
            return;
        }

        await client.messages.create({
            body,
            from: env.TWILIO_PHONE,
            to,
        });
    } catch (error) {
        logger.error('Failed to send SMS:', error);
        throw error;
    }
};
