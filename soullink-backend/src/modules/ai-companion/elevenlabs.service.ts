import { Response } from 'express';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

class ElevenLabsService {
    private get apiKey() { return env.ELEVENLABS_API_KEY; }
    private get voiceId() { return env.ELEVENLABS_VOICE_ID; }
    private readonly baseUrl = 'https://api.elevenlabs.io/v1';

    /**
     * Streams TTS audio from ElevenLabs directly into the Express response.
     * Uses the /stream endpoint + eleven_turbo_v2_5 model for minimum latency.
     * Fully compatible with the ElevenLabs free plan (uses premade voices only).
     */
    async streamSpeech(text: string, res: Response): Promise<void> {
        if (!this.apiKey) {
            logger.warn('[TTS] ELEVENLABS_API_KEY not configured');
            res.status(503).json({ status: 'error', message: 'TTS not configured' });
            return;
        }

        try {
            const elevenRes = await fetch(
                `${this.baseUrl}/text-to-speech/${this.voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text,
                        // eleven_turbo_v2_5 = ElevenLabs fastest model, free-plan compatible
                        model_id: 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                            style: 0,
                            use_speaker_boost: true,
                        },
                        // Maximize streaming latency optimization (0=none, 4=max)
                        optimize_streaming_latency: 3,
                    }),
                }
            );

            if (!elevenRes.ok) {
                let errorDetail: any = {};
                try { errorDetail = await elevenRes.json(); } catch { /* ignore */ }
                logger.error(`[TTS] ElevenLabs error (${elevenRes.status}):`, errorDetail);
                if (!res.headersSent) {
                    res.status(elevenRes.status).json({
                        status: 'error',
                        message: errorDetail?.detail?.message || 'TTS generation failed',
                    });
                }
                return;
            }

            if (!elevenRes.body) {
                res.status(502).json({ status: 'error', message: 'Empty TTS stream' });
                return;
            }

            // Stream audio chunks directly to client as they arrive
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Cache-Control', 'no-cache');

            const reader = elevenRes.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
            }
            res.end();

        } catch (error) {
            logger.error('[TTS] Stream request failed:', error);
            if (!res.headersSent) {
                res.status(500).json({ status: 'error', message: 'TTS stream failed' });
            }
        }
    }

    /**
     * Returns remaining character credits on the ElevenLabs account.
     */
    async getCredits(): Promise<number> {
        if (!this.apiKey) return 0;
        try {
            const res = await fetch(`${this.baseUrl}/user`, {
                headers: { 'xi-api-key': this.apiKey },
            });
            if (!res.ok) return 0;
            const data = await res.json();
            const info = data?.subscription_info;
            if (!info) return 0;
            return info.character_limit - info.character_count;
        } catch {
            return 0;
        }
    }
}

export const elevenLabsService = new ElevenLabsService();
