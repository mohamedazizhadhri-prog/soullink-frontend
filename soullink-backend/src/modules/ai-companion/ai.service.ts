import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';
import { BASE_SYSTEM_PROMPT, SUMMARY_PROMPT, GAME_COMMENT_PROMPT } from './nova.prompt.js';
import { embeddingService } from './embedding.service.js';
import { vectorService } from './vector.service.js';
import { memoryService } from './memory.service.js';
import { llmService } from './llm.service.js';
import { contextService } from './context.service.js';
import { AI_CONFIG, MODELS } from './ai.constants.js';

interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    emotionDetected?: string | null;
    createdAt: Date;
}

export class AIService {
    /**
     * Main chat entry point.
     */
    async generateResponse(userId: string, userMessage: string, skipSave = false, timezone?: string) {
        if (userMessage.length > 2000) {
            throw new Error('Message too long. Nova prefers shorter deep thoughts (max 2000 chars).');
        }
        try {
            // 1. Get user conversation (findFirst because userId isn't unique in schema)
            let conversation = await prisma.aIConversation.findFirst({
                where: { userId },
                include: { messages: { orderBy: { createdAt: 'desc' }, take: AI_CONFIG.CONTEXT_WINDOW_SIZE } },
                orderBy: { createdAt: 'desc' }
            });

            if (!conversation) {
                conversation = await prisma.aIConversation.create({
                    data: { userId },
                    include: { messages: true }
                });
            }

            // 2. Build Context (Personality, Gaming, Memory)
            const [userContext, vector, messageCount] = await Promise.all([
                contextService.getUserContext(userId, userMessage, timezone),
                embeddingService.embedQuery(userMessage),
                prisma.aIMessage.count({ where: { conversationId: conversation.id } })
            ]);

            // 3. RAG: Search similar past memories
            let pastMemories = "";
            if (vector && vectorService.isEnabled()) {
                const results = await vectorService.searchMemories(userId, vector);
                if (results.length > 0) {
                    pastMemories = `\nRELEVANT PAST MEMORIES:\n- ${results.join('\n- ')}`;
                }
            }

            // 4. Construct Final Prompt
            const history = (conversation.messages as unknown as AIMessage[] || []).reverse().map((m) => ({
                role: m.role,
                content: m.content
            }));

            const finalSystemPrompt = `
${BASE_SYSTEM_PROMPT}

${userContext}
${pastMemories}

CONVERSATION HISTORY (Last ${AI_CONFIG.CONTEXT_WINDOW_SIZE} messages):
${history.map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}
`;

            // 5. Call LLM
            const responseText = await llmService.call(finalSystemPrompt, userMessage, MODELS.MAIN, 0.7, 800, { type: 'json_object' });
            if (!responseText) throw new Error('AI returned no response');

            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch (e) {
                logger.error('[AI] Failed to parse response JSON:', responseText);
                throw new Error('Invalid AI response format');
            }

            // 6. DB Updates (Parallel)
            if (!skipSave) {
                await Promise.all([
                    this.saveMessage(conversation.id, 'user', userMessage, null, false, userId),
                    this.saveMessage(conversation.id, 'assistant', parsed.response, parsed.mood || 'neutral', false, userId),
                    this.processSideEffects(userId, conversation.id, messageCount, history, userMessage, parsed)
                ]);
            }

            return {
                response: parsed.response,
                mood: parsed.mood || 'neutral',
                thought: parsed.thought
            };
        } catch (error) {
            logger.error('[AI] Chat failed:', error);
            throw error;
        }
    }

    /**
     * Handles background tasks like trust events and memory extraction.
     */
    private async processSideEffects(userId: string, conversationId: string, count: number, history: any[], userMessage: string, parsed: any) {
        // Trust Events
        if (parsed.mood === 'love' || parsed.mood === 'happy') {
            await memoryService.recordTrustEvent(userId, 'emotional_moment');
        }

        // Periodic Summary & Memory
        if (count > 0 && count % AI_CONFIG.FACT_EXTRACTION_INTERVAL === 0) {
            const recent = [...history, { role: 'user', content: userMessage }, { role: 'assistant', content: parsed.response }];
            memoryService.extractFactsAndUpdateMemory(userId, recent);
        }

        if (count > 0 && count % AI_CONFIG.SUMMARY_TRIGGER_COUNT === 0) {
            this.updateConversationSummary(conversationId, [...history, { role: 'user', content: userMessage }]);
        }
    }

    async saveMessage(conversationId: string, role: string, content: string, mood: string | null = null, isProactive = false, userId?: string) {
        const msg = await prisma.aIMessage.create({
            data: { conversationId, role, content, emotionDetected: mood, isProactive }
        });

        // Background embedding for RAG
        if (userId && embeddingService.isEnabled()) {
            embeddingService.embed(content).then(vector => {
                if (vector) vectorService.saveMemory(userId, msg.id, content, vector);
            });
        }
        return msg;
    }

    private async updateConversationSummary(conversationId: string, history: any[]) {
        const historyText = history.map((m: any) => `${m.role}: ${m.content}`).join('\n');
        const summary = await llmService.call(SUMMARY_PROMPT, `Summarize:\n${historyText}`, MODELS.LIGHT, 0.3, 300);
        if (summary) {
            await prisma.aIConversation.update({ where: { id: conversationId }, data: { summary } });
            logger.info('[AI] Updated conversation summary');
        }
    }

    async generateGameComment(userId: string, gameId: string, sceneId: string, choiceId: string, responseTimeMs: number) {
        const [context, choice] = await Promise.all([
            contextService.getUserContext(userId),
            prisma.gameChoice.findUnique({ where: { id: choiceId } })
        ]);

        const userPrompt = `Choice: "${choice?.text}". Time: ${responseTimeMs}ms.`;
        const resultText = await llmService.call(GAME_COMMENT_PROMPT, `${context}\n\n${userPrompt}`, MODELS.MAIN, 0.8, 400, { type: 'json_object' });

        if (!resultText) return { comment: null, mood: 'neutral', skip: true };

        try {
            const parsed = JSON.parse(resultText);
            return {
                comment: parsed.skip ? null : parsed.comment,
                mood: parsed.mood || 'neutral',
                skip: !!parsed.skip
            };
        } catch (e) {
            return { comment: null, mood: 'neutral', skip: true };
        }
    }

    async generateProactiveMessage(userId: string, trigger: 'absence' | 'morning' | 'night' | 'random') {
        const context = await contextService.getUserContext(userId);
        const systemPrompt = `You are Nova. Initiate a conversation. Trigger: ${trigger}. Context:\n${context}`;
        const res = await llmService.call(systemPrompt, "Say something brief and engaging.", MODELS.LIGHT, 0.8, 300, { type: 'json_object' });

        if (!res) return;
        try {
            const parsed = JSON.parse(res);
            const conversation = await prisma.aIConversation.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
            if (conversation) {
                await this.saveMessage(conversation.id, 'assistant', parsed.response, parsed.mood || 'neutral', true, userId);
                return parsed.response;
            }
        } catch (e) {
            logger.warn('[AI] Proactive parse failed');
        }
    }

    async getChatHistory(userId: string, limit = AI_CONFIG.MAX_HISTORY_LOAD) {
        const conversation = await prisma.aIConversation.findFirst({
            where: { userId },
            include: { messages: { orderBy: { createdAt: 'desc' }, take: limit } },
            orderBy: { createdAt: 'desc' }
        });

        if (!conversation) return { conversationId: null, messages: [] };

        return {
            conversationId: conversation.id,
            messages: (conversation.messages as unknown as AIMessage[] || []).reverse().map((m) => ({
                id: m.id,
                sender: m.role === 'user' ? 'user' : 'nova',
                text: m.content,
                timestamp: m.createdAt.getTime(),
                emotionDetected: m.emotionDetected || null,
            })),
        };
    }
}

export const aiService = new AIService();
