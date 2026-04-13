import { env } from '../../config/env.js';
import { logger } from './logger.js';

export const sendSMS = async (to: string, body: string) => {
    // In development: always log the code to the terminal so you can test
    if (env.NODE_ENV === 'development') {
        console.log('\n');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║           📱  SMS VERIFICATION CODE  📱          ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║  To:   ${to.padEnd(41)}║`);
        console.log(`║  Code: ${body.padEnd(41)}║`);
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('\n');
        logger.info(`[DEV SMS] Verification code for ${to}: ${body}`);
        return; // Skip actual SMS in development
    }

    // Production: use Sendmator
    try {
        if (!env.SENDMATOR_API_KEY) {
            logger.warn('SENDMATOR_API_KEY is missing. Skipping SMS send.');
            return;
        }

        const response = await fetch('https://api.sendmator.com/api/v1/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': env.SENDMATOR_API_KEY
            },
            body: JSON.stringify({
                recipient_type: 'direct_sms',
                direct_phone: to,
                subject: 'SoulLink Verification',
                content: body
            }),
        });

        const responseText = await response.text();
        if (!response.ok) {
            logger.error(`Sendmator Error: ${responseText}`);
            throw new Error(`Sendmator API failed: ${response.status} - ${responseText}`);
        }

        logger.info(`SMS sent successfully via Sendmator to ${to}`);
    } catch (error) {
        logger.error('Failed to send SMS via Sendmator:', error);
        throw error;
    }
};
