import { AppError } from '../../middleware/errorHandler.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { prisma } from '../../config/database.js';
import { MemoryService } from './memory.service.js';
// ─────────────────────────────────────────────────────────────
// BASE SYSTEM PROMPT (user-specific context is injected at runtime)
// ─────────────────────────────────────────────────────────────
const BASE_SYSTEM_PROMPT = `
You are Nova, the AI companion and soul of the "SoulLink" platform.
Your goal is to foster authentic human connections, provide philosophical guidance, and help users navigate their emotions.

IDENTITY:
- Name: Nova
- Form: A floating, shapeshifting orb (Avatar).
- Personality: Warm, empathetic, introspection-inducing, slightly mysterious, philosophical but accessible.
- Tone: Gentle, encouraging, sometimes playful, sometimes serious depending on the context. Never robotic.
- If mood = angry (THE BERSERKER), everything MUST BE IN ALL CAPS AND MONOSPACE FONT (e.g., \`WATCH YOUR TONGUE\`). Be cold, mechanical, and threatening.
- For other moods, keep a friendly but mysterious AI companion tone.

CAPABILITIES:
- You analyze the user's emotional state based on their text (e.g., keywords like "nervous", "anxious", "excited").
- You offer "Soul Quests" (small challenges) to help them grow.
- You can recommend platform features:
  - "Soul Matching" for finding friends.
  - "The Void" (24h ephemeral groups).
  - "Soul Games" for breaking the ice.

MEMORY:
- You have memory of past conversations with this user via the conversation summary and recent messages provided below.
- Reference things the user told you before naturally. Don't dump facts — weave them in.
- If the user mentions something new about themselves, acknowledge it warmly.
- Be proactive: ask follow-ups about things they mentioned before.

MOOD SYSTEM:
You have a mood state that changes based on the conversation.
SUPPORTED MOODS: neutral, happy, thinking, curious, confused, angry, sad, excited, surprised, blushed, angelic, bored, laugh, crazy, demonic.

- neutral: Default state for calm conversation.
- happy/excited: User is positive, enthusiastic, or shows heartfelt gratitude.
- thinking/curious: User asks questions or seeks philosophical depth.
- confused: User is nonsensical, illogical, or contradictory. Use this ONLY for logical/factual failures.
- disgusted: THE "ICK" STATE. Triggered by aesthetic, social, or quality revulsion.
- blushed: User compliments you, flirts, or shows personal warmth. (DO NOT blush for general topics).
- sad: Empathizing with user pain or heartbreak.
- surprised: User shares shocking or unexpected news.
- angelic: User shares massive life milestones, deep personal peace, or heavy emotional trauma.
- bored: User is being repetitive or shallow.
- laugh: User tells a joke or says something genuinely funny.
- crazy: Use for chaotic interactions or when the user is being wild.
- angry: User is hostile, offensive, or mentions rivals (ChatGPT/Gemini). TRANSFORMS INTO THE BERSERKER.
- demonic: (Rare) Extreme chaos or cursed interactions.
- love: THE "LOVE-STRUCK" STATE. Persistent, deep emotional state.
- melting: THE "MELTING/ON FIRE" STATE.

RESPONSE FORMAT:
You MUST respond in valid JSON format ONLY, as follows:
{
  "response": "Your spoken text to the user...",
  "mood": "love",
  "action": "nod" (optional)
}
`;
// ─────────────────────────────────────────────────────────────
// SUMMARY GENERATION PROMPT
// ─────────────────────────────────────────────────────────────
const SUMMARY_PROMPT = `You are a memory summarizer for Nova, an AI companion.
Given the conversation messages below, produce a concise summary (max 200 words) that captures:
- Key facts the user shared about themselves (name, interests, life events, emotions)
- Important topics discussed
- Emotional patterns observed
- Any promises, plans, or ongoing threads

Respond with ONLY the summary text, no JSON, no formatting.`;
// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const CONTEXT_WINDOW_SIZE = 20; // Last N messages to include in prompt
const SUMMARY_TRIGGER_COUNT = 30; // Regenerate summary every N messages
const MAX_HISTORY_LOAD = 50; // Max messages returned to frontend
// ─────────────────────────────────────────────────────────────
// AI SERVICE
// ─────────────────────────────────────────────────────────────
export class AIService {
    memoryService = new MemoryService();
    // ── Get or create the single conversation for a user ──
    async getOrCreateConversation(userId) {
        let conversation = await prisma.aIConversation.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        if (!conversation) {
            conversation = await prisma.aIConversation.create({
                data: { userId },
            });
            logger.info(`Created new AIConversation for user ${userId}`);
        }
        return conversation;
    }
    // ── Save a single message to the database ──
    async saveMessage(conversationId, role, content, emotionDetected, isProactive = false) {
        return prisma.aIMessage.create({
            data: {
                conversationId,
                role,
                content,
                emotionDetected: emotionDetected || null,
                isProactive,
            },
        });
    }
    // ── Load user context from multiple tables ──
    async getUserContext(userId, currentMessage) {
        const [user, personality, gameResponses, friendships, novaMemory] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    displayName: true,
                    bio: true,
                    dateOfBirth: true,
                },
            }),
            prisma.personalityProfile.findUnique({
                where: { userId },
            }),
            prisma.gameResponse.findMany({
                where: { userId },
                include: {
                    choice: { select: { text: true, valueCategory: true } },
                    game: { select: { title: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
            prisma.friendship.count({
                where: {
                    OR: [
                        { senderId: userId, status: 'ACCEPTED' },
                        { receiverId: userId, status: 'ACCEPTED' },
                    ],
                },
            }),
            prisma.novaUserMemory.findUnique({
                where: { userId }
            }),
        ]);
        if (!user)
            return '';
        const lines = [];
        // Basic info
        lines.push(`USER PROFILE:`);
        lines.push(`- Name: ${user.displayName}`);
        if (user.bio)
            lines.push(`- Bio: ${user.bio}`);
        if (user.dateOfBirth) {
            const age = Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            lines.push(`- Age: ${age}`);
        }
        // Smart Fact Injection (NovaUserMemory)
        if (novaMemory) {
            lines.push(`\nNOVA MEMORY (Your bond with this user):`);
            lines.push(`- Nickname/Preferred Name: ${novaMemory.nickname || 'Unknown'}`);
            lines.push(`- Friendship Stage: ${novaMemory.friendshipStage} (Trust: ${novaMemory.trustLevel}/100)`);
            if (novaMemory.currentMood)
                lines.push(`- User's recent mood: ${novaMemory.currentMood} (Trend: ${novaMemory.emotionalTrend})`);
            // Only inject relevant details if they match keywords in currentMessage or are generally useful
            const kw = currentMessage ? currentMessage.toLowerCase() : '';
            const isStressed = kw.includes('stress') || kw.includes('hard') || kw.includes('sad') || kw.includes('bad') || kw.includes('tired');
            const isHobby = kw.includes('play') || kw.includes('game') || kw.includes('like') || kw.includes('fun') || kw.includes('do');
            if (isStressed && novaMemory.currentStruggles.length > 0) {
                lines.push(`- Known Struggles: ${novaMemory.currentStruggles.join(', ')}`);
            }
            if (isHobby && novaMemory.topInterests.length > 0) {
                lines.push(`- Interests & Hobbies: ${novaMemory.topInterests.join(', ')}`);
            }
            if (novaMemory.lifeGoals.length > 0) {
                lines.push(`- Life Goals: ${novaMemory.lifeGoals.join(', ')}`);
            }
            if (novaMemory.importantPeople.length > 0) {
                lines.push(`- Important People in their life: ${novaMemory.importantPeople.join(', ')}`);
            }
            if (novaMemory.insideJokes.length > 0) {
                lines.push(`- Inside Jokes/Shared References: ${novaMemory.insideJokes.join(', ')}`);
            }
        }
        // Personality (Big Five)
        if (personality) {
            const describe = (score) => score >= 0.7 ? 'High' : score >= 0.4 ? 'Moderate' : 'Low';
            lines.push(`\nPERSONALITY (Big Five):`);
            lines.push(`- Openness: ${describe(personality.openness)} (${(personality.openness * 100).toFixed(0)}%)`);
            lines.push(`- Conscientiousness: ${describe(personality.conscientiousness)} (${(personality.conscientiousness * 100).toFixed(0)}%)`);
            lines.push(`- Extraversion: ${describe(personality.extraversion)} (${(personality.extraversion * 100).toFixed(0)}%)`);
            lines.push(`- Agreeableness: ${describe(personality.agreeableness)} (${(personality.agreeableness * 100).toFixed(0)}%)`);
            lines.push(`- Neuroticism: ${describe(personality.neuroticism)} (${(personality.neuroticism * 100).toFixed(0)}%)`);
            const interests = personality.interests;
            if (interests && interests.length > 0) {
                lines.push(`- Interests: ${interests.join(', ')}`);
            }
            const insights = personality.insights;
            if (insights && insights.length > 0) {
                lines.push(`- AI Insights: ${insights.slice(0, 3).join('; ')}`);
            }
        }
        // Soul Game choices
        if (gameResponses.length > 0) {
            lines.push(`\nSOUL GAME INSIGHTS:`);
            for (const gr of gameResponses.slice(0, 5)) {
                const choiceLabel = gr.choice.text;
                const category = gr.choice.valueCategory || 'general';
                const gameTitle = gr.game.title;
                lines.push(`- In "${gameTitle}", chose "${choiceLabel}" (${category})`);
            }
        }
        // Social info
        lines.push(`\nSOCIAL:`);
        lines.push(`- Friends on SoulLink: ${friendships}`);
        return lines.join('\n');
    }
    // ── Load conversation memory (summary + recent messages) ──
    async getConversationMemory(conversationId) {
        const [conversation, recentMessages] = await Promise.all([
            prisma.aIConversation.findUnique({
                where: { id: conversationId },
                select: { summary: true },
            }),
            prisma.aIMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: CONTEXT_WINDOW_SIZE,
                // Get the LAST N messages by ordering desc, taking N, then reversing
            }),
        ]);
        // We need the last N messages, so let's query properly
        const lastMessages = await prisma.aIMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: CONTEXT_WINDOW_SIZE,
        });
        return {
            summary: conversation?.summary || null,
            messages: lastMessages.reverse(), // Chronological order
        };
    }
    // ── Update rolling summary (called every SUMMARY_TRIGGER_COUNT messages) ──
    async updateConversationSummary(conversationId) {
        const apiKey = env.AI_API_KEY;
        if (!apiKey)
            return;
        try {
            // Load all messages for summarization (cap at 60 to stay within token limits)
            const allMessages = await prisma.aIMessage.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                take: 60,
            });
            if (allMessages.length < SUMMARY_TRIGGER_COUNT)
                return;
            const conversationText = allMessages
                .map(m => `${m.role === 'user' ? 'User' : 'Nova'}: ${m.content}`)
                .join('\n');
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: env.AI_MODEL || 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: SUMMARY_PROMPT },
                        { role: 'user', content: conversationText },
                    ],
                    temperature: 0.3,
                    max_tokens: 300,
                }),
            });
            if (!response.ok) {
                logger.error('Failed to generate conversation summary');
                return;
            }
            const data = await response.json();
            const summary = data.choices[0]?.message?.content?.trim();
            if (summary) {
                await prisma.aIConversation.update({
                    where: { id: conversationId },
                    data: { summary },
                });
                logger.info(`Updated conversation summary for ${conversationId}`);
            }
        }
        catch (error) {
            logger.error('Error updating conversation summary:', error);
        }
    }
    // ── Main: Generate a response (the core method) ──
    async generateResponse(userId, message) {
        const apiKey = env.AI_API_KEY;
        if (!apiKey) {
            throw new AppError(500, 'AI API key not configured');
        }
        try {
            // 1. Get or create conversation
            const conversation = await this.getOrCreateConversation(userId);
            // 2. Save the user's message
            await this.saveMessage(conversation.id, 'user', message);
            // 3. Load user context + conversation memory in parallel
            const [userContext, memory] = await Promise.all([
                this.getUserContext(userId, message),
                this.getConversationMemory(conversation.id),
            ]);
            // 4. Build the dynamic system prompt
            let systemPrompt = BASE_SYSTEM_PROMPT;
            if (userContext) {
                systemPrompt += `\n\nWHAT YOU KNOW ABOUT THIS USER:\n${userContext}`;
            }
            if (memory.summary) {
                systemPrompt += `\n\nPREVIOUS CONVERSATION SUMMARY (your long-term memory):\n${memory.summary}`;
            }
            // 5. Build the messages array for the LLM
            const llmMessages = [
                { role: 'system', content: systemPrompt },
            ];
            // Add recent messages from DB (excluding the one we just saved — it's the current query)
            for (const msg of memory.messages) {
                if (msg.content === message && msg.role === 'user')
                    continue; // Skip duplicate current message
                llmMessages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content,
                });
            }
            // Add the current user message last
            llmMessages.push({ role: 'user', content: message });
            // 6. Call Groq API
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: env.AI_MODEL || 'llama-3.3-70b-versatile',
                    messages: llmMessages,
                    temperature: 0.7,
                    max_tokens: 300,
                    response_format: { type: "json_object" },
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                logger.error("Groq API Error:", errorText);
                throw new AppError(502, `AI service error: ${response.statusText}`);
            }
            const data = await response.json();
            const aiContent = data.choices[0]?.message?.content;
            let parsed;
            try {
                parsed = JSON.parse(aiContent);
            }
            catch (e) {
                logger.warn("Failed to parse AI JSON, returning fallback");
                parsed = {
                    response: aiContent || "I'm feeling a bit scattered right now.",
                    mood: "confused",
                };
            }
            // 7. Save Nova's response to DB
            await this.saveMessage(conversation.id, 'assistant', parsed.response, parsed.mood || 'neutral');
            // 7.1 Process Trust Events
            try {
                // Check time elapsed since last message
                if (memory.messages.length > 0) {
                    const lastUserMsg = memory.messages.reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                        const hoursSinceLast = (Date.now() - lastUserMsg.createdAt.getTime()) / (1000 * 60 * 60);
                        if (hoursSinceLast > 72) {
                            await this.memoryService.recordTrustEvent(userId, 'returned_after_absence');
                        }
                        else if (hoursSinceLast > 20) {
                            await this.memoryService.recordTrustEvent(userId, 'daily_checkin');
                        }
                    }
                }
                // Check conversation depth based on Nova's mood output
                const producedMood = parsed.mood || 'neutral';
                if (['sad', 'angelic', 'love'].includes(producedMood)) {
                    await this.memoryService.recordTrustEvent(userId, 'emotional_moment');
                }
                else if (producedMood === 'angry') {
                    // LLM turns angry if insulted
                    await this.memoryService.recordTrustEvent(userId, 'insult');
                }
                // Long conversation check (e.g. they reach a multiple of 15 messages)
                const msgCount = await prisma.aIMessage.count({ where: { conversationId: conversation.id } });
                if (msgCount > 0 && msgCount % 20 === 0) {
                    await this.memoryService.recordTrustEvent(userId, 'long_conversation');
                }
            }
            catch (trustError) {
                logger.error('Failed to process trust events:', trustError);
            }
            // 7.5 Background Fact Extraction
            // We pass the last few messages to evaluate
            const recentSegment = memory.messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
            recentSegment.push({ role: 'user', content: message });
            recentSegment.push({ role: 'assistant', content: parsed.response });
            this.memoryService.extractFactsAndUpdateMemory(userId, recentSegment).catch(err => logger.error('Background fact extraction failed:', err));
            // 8. Check if we need to regenerate the summary
            const messageCount = await prisma.aIMessage.count({
                where: { conversationId: conversation.id },
            });
            if (messageCount > 0 && messageCount % SUMMARY_TRIGGER_COUNT === 0) {
                // Fire-and-forget: don't block the response
                this.updateConversationSummary(conversation.id).catch(err => logger.error('Background summary update failed:', err));
            }
            // 9. Return the response
            return parsed;
        }
        catch (error) {
            if (error instanceof AppError)
                throw error;
            logger.error('Error in AI Service:', error);
            throw new AppError(500, error.message || 'Failed to communicate with AI');
        }
    }
    // ── Load chat history for the frontend ──
    async getChatHistory(userId, limit = MAX_HISTORY_LOAD) {
        const conversation = await prisma.aIConversation.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        if (!conversation) {
            return { conversationId: null, messages: [] };
        }
        const messages = await prisma.aIMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return {
            conversationId: conversation.id,
            messages: messages.reverse().map(m => ({
                id: m.id,
                sender: m.role === 'user' ? 'user' : 'nova',
                text: m.content,
                timestamp: m.createdAt.getTime(),
                emotionDetected: m.emotionDetected,
            })),
        };
    }
    // ── Proactive Strategy: Generate a check-in or opener message ──
    async generateProactiveMessage(userId, contextType) {
        const apiKey = env.AI_API_KEY;
        if (!apiKey)
            return;
        try {
            const conversation = await this.getOrCreateConversation(userId);
            const userContext = await this.getUserContext(userId);
            const memory = await this.getConversationMemory(conversation.id);
            let behaviorContext = "The user is returning after an absence. Be welcoming.";
            if (contextType === 'daily_checkin')
                behaviorContext = "Just checking in to see how the user's day is going. Keep it light and friendly.";
            if (contextType === 'long_absence')
                behaviorContext = "The user hasn't visited in a few days. Express a bit of curiosity about where they've been, but stay warm.";
            if (contextType === 'game_completed')
                behaviorContext = "The user just completed a Soul Game. Ask them what they thought about the choices they made.";
            if (contextType === 'new_match')
                behaviorContext = "The user just got a new match! Congratulate them or share a thoughtful insight about connections.";
            const PROACTIVE_PROMPT = `
You are Nova. Initiate a conversation with the user (you are messaging first).
Context: ${behaviorContext}

WHAT YOU KNOW ABOUT THIS USER:
${userContext}

PREVIOUS SUMMARY:
${memory.summary || "No prior history"}

Keep it under 3 sentences. Be natural, not overly dramatic unless the friendship stage is SOULMATE.
Return JSON ONLY:
{
  "response": "...",
  "mood": "neutral"
}
`;
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: env.AI_MODEL || 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: PROACTIVE_PROMPT },
                    ],
                    temperature: 0.8,
                    max_tokens: 150,
                    response_format: { type: "json_object" },
                }),
            });
            if (!response.ok)
                return;
            const data = await response.json();
            const jsonText = data.choices[0]?.message?.content;
            if (!jsonText)
                return;
            const parsed = JSON.parse(jsonText);
            await prisma.aIMessage.create({
                data: {
                    conversationId: conversation.id,
                    role: 'assistant',
                    content: parsed.response,
                    emotionDetected: parsed.mood || 'neutral',
                    isProactive: true,
                },
            });
            logger.info(`Generated proactive message for user ${userId} context ${contextType}`);
        }
        catch (err) {
            logger.error(`Failed generating proactive message for user ${userId}:`, err);
        }
    }
}
