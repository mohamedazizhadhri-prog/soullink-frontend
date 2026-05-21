// src/modules/ai-companion/llm.service.ts
// EF-074: Model is now read from the AIModelVersion table (isActive=true)
// with a 60-second in-memory cache. Falls back to MODELS.MAIN constant.
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { GROQ_API_URL, MODELS } from './ai.constants.js';
import { UsageTrackerService } from '../../cron/usageTracker.js';
import { prisma } from '../../config/database.js';

// ─── Active-model cache (EF-074) ────────────────────────────────────────────
let activeModelCache: { model: string; expires: number } | null = null;
const MODEL_CACHE_TTL = 60_000; // 60 seconds

async function getActiveModel(): Promise<string> {
    if (activeModelCache && activeModelCache.expires > Date.now()) {
        return activeModelCache.model;
    }
    try {
        const active = await prisma.aIModelVersion.findFirst({
            where: { isActive: true },
            orderBy: { deployedAt: 'desc' },
        });
        const model = active?.name && active?.version
            ? active.name          // stored as the Groq model ID e.g. "llama-3.3-70b-versatile"
            : MODELS.MAIN;
        activeModelCache = { model, expires: Date.now() + MODEL_CACHE_TTL };
        return model;
    } catch {
        return MODELS.MAIN;
    }
}

/** Call from admin service after activating/creating a model — busts cache immediately. */
export function bustModelCache() {
    activeModelCache = null;
}

export class LLMService {
    async call(
        systemPrompt: string,
        userPrompt: string,
        model?: string,          // if provided, skip dynamic lookup
        temperature = 0.7,
        maxTokens = 800,
        responseFormat?: { type: 'json_object' }
    ): Promise<string | null> {
        const apiKey = env.AI_API_KEY;
        if (!apiKey) {
            logger.error('[LLM] AI_API_KEY not found');
            return null;
        }

        // EF-074: resolve model dynamically if not explicitly passed
        const resolvedModel = model ?? await getActiveModel();

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: resolvedModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user',   content: userPrompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    response_format: responseFormat,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error(`[LLM] API Error (${response.status}) with model "${resolvedModel}":`, errorBody);
                return null;
            }

            const data = await response.json();

            // Track token consumption
            const totalTokens = data.usage?.total_tokens ?? 0;
            if (totalTokens > 0) {
                UsageTrackerService.increment('GROQ', 'tokens', totalTokens).catch(() => {});
            }

            return data.choices?.[0]?.message?.content || null;
        } catch (error) {
            logger.error('[LLM] Request failed:', error);
            return null;
        }
    }
}

export const llmService = new LLMService();
