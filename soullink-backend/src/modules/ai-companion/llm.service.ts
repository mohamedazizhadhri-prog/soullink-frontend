// src/modules/ai-companion/llm.service.ts
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { GROQ_API_URL, MODELS } from './ai.constants.js';

export class LLMService {
    async call(
        systemPrompt: string,
        userPrompt: string,
        model = MODELS.MAIN,
        temperature = 0.7,
        maxTokens = 800,
        responseFormat?: { type: 'json_object' }
    ): Promise<string | null> {
        const apiKey = env.AI_API_KEY;
        if (!apiKey) {
            logger.error('[LLM] AI_API_KEY not found');
            return null;
        }

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    response_format: responseFormat,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error(`[LLM] API Error (${response.status}):`, errorBody);
                return null;
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
        } catch (error) {
            logger.error('[LLM] Request failed:', error);
            return null;
        }
    }
}

export const llmService = new LLMService();
