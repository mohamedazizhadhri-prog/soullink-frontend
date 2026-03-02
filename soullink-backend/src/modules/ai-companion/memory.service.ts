import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

export type TrustEvent =
    | 'shared_secret'
    | 'daily_checkin'
    | 'emotional_moment'
    | 'insult'
    | 'long_conversation'
    | 'returned_after_absence'
    | 'completed_game';

const TRUST_EVENTS: Record<TrustEvent, number> = {
    shared_secret: 8,
    daily_checkin: 2,
    emotional_moment: 5,
    insult: -10,
    long_conversation: 3,
    returned_after_absence: 4,
    completed_game: 6,
};

function getFriendshipStage(trustLevel: number): string {
    if (trustLevel <= 20) return "NEW";
    if (trustLevel <= 45) return "FAMILIAR";
    if (trustLevel <= 70) return "FRIEND";
    if (trustLevel <= 90) return "CLOSE";
    return "SOULMATE";
}

export class MemoryService {
    /**
     * Extracts structured user facts and emotional trends from a conversation segment
     * and updates the `NovaUserMemory` model.
     */
    async extractFactsAndUpdateMemory(userId: string, recentMessages: { role: string; content: string }[]) {
        const apiKey = env.AI_API_KEY;
        if (!apiKey) return;

        if (recentMessages.length === 0) return;

        try {
            const conversationText = recentMessages
                .map(m => `${m.role === 'user' ? 'User' : 'Nova'}: ${m.content}`)
                .join('\n');

            const SYSTEM_PROMPT = `
You are Nova's internal memory processing module.
Extract structured facts about the user from the conversation snippet.
Return exactly valid JSON with the following keys, containing what you learned or inferred. If you didn't learn something new for a category, omit it or keep it null/empty, EXCEPT for currentMood and emotionalTrend which you must estimate from this snippet.
Do not invent anything. If unsure, omit it.

Expected JSON structure:
{
  "nickname": "string or null",
  "occupation": "string or null",
  "currentMood": "string (e.g. 'anxious', 'happy', 'neutral')",
  "emotionalTrend": "string ('improving', 'declining', 'stable')",
  "topInterests": ["array", "of", "strings"],
  "lifeGoals": ["array", "of", "strings"],
  "currentStruggles": ["array", "of", "strings"],
  "importantPeople": ["array", "of", "strings"],
  "lastTopicDiscussed": "string (brief summary of the conversation topic)",
  "insideJokes": ["array", "of", "strings"],
  "preferredTone": "string ('casual', 'deep', 'playful' etc)"
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
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: conversationText },
                    ],
                    temperature: 0.1,
                    max_tokens: 400,
                    response_format: { type: "json_object" }
                }),
            });

            if (!response.ok) {
                logger.error('Fact extraction failed: API error');
                return;
            }

            const data = await response.json();
            const jsonContent = data.choices?.[0]?.message?.content;

            if (!jsonContent) return;

            let extracted: any;
            try {
                extracted = JSON.parse(jsonContent);
            } catch (e) {
                logger.error('Fact extraction failed to parse JSON', e);
                return;
            }

            // Fetch current memory
            let memory = await (prisma as any).novaUserMemory.findUnique({ where: { userId } });

            if (!memory) {
                memory = await (prisma as any).novaUserMemory.create({
                    data: {
                        userId,
                        trustLevel: 0,
                        friendshipStage: "NEW"
                    }
                });
            }

            // Merge arrays (remove duplicates)
            const mergeUnique = (oldArr: string[], newArr: string[]) => Array.from(new Set([...(oldArr || []), ...(newArr || [])]));

            await (prisma as any).novaUserMemory.update({
                where: { userId },
                data: {
                    nickname: extracted.nickname || memory.nickname,
                    occupation: extracted.occupation || memory.occupation,
                    currentMood: extracted.currentMood || memory.currentMood,
                    emotionalTrend: extracted.emotionalTrend || memory.emotionalTrend,
                    topInterests: extracted.topInterests?.length ? mergeUnique(memory.topInterests, extracted.topInterests) : memory.topInterests,
                    lifeGoals: extracted.lifeGoals?.length ? mergeUnique(memory.lifeGoals, extracted.lifeGoals) : memory.lifeGoals,
                    currentStruggles: extracted.currentStruggles?.length ? mergeUnique(memory.currentStruggles, extracted.currentStruggles) : memory.currentStruggles,
                    importantPeople: extracted.importantPeople?.length ? mergeUnique(memory.importantPeople, extracted.importantPeople) : memory.importantPeople,
                    lastTopicDiscussed: extracted.lastTopicDiscussed || memory.lastTopicDiscussed,
                    insideJokes: extracted.insideJokes?.length ? mergeUnique(memory.insideJokes, extracted.insideJokes) : memory.insideJokes,
                    preferredTone: extracted.preferredTone || memory.preferredTone,
                }
            });

            logger.info(`Updated structured memory for user ${userId}`);

        } catch (error) {
            logger.error('Error extracting memory facts:', error);
        }
    }

    /**
     * Adjusts the trust level based on a specific event and updates the friendship stage.
     */
    async recordTrustEvent(userId: string, eventType: TrustEvent) {
        try {
            let memory = await (prisma as any).novaUserMemory.findUnique({ where: { userId } });

            if (!memory) {
                memory = await (prisma as any).novaUserMemory.create({
                    data: { userId, trustLevel: 0, friendshipStage: "NEW" }
                });
            }

            const delta = TRUST_EVENTS[eventType];
            let newTrust = memory.trustLevel + delta;

            // Boundary enforcement
            if (newTrust < 0) newTrust = 0;
            if (newTrust > 100) newTrust = 100;

            const newStage = getFriendshipStage(newTrust);

            await (prisma as any).novaUserMemory.update({
                where: { userId },
                data: {
                    trustLevel: newTrust,
                    friendshipStage: newStage
                }
            });

            logger.info(`Recorded trust event ${eventType} for ${userId} (Trust: ${newTrust}, Stage: ${newStage})`);

        } catch (error) {
            logger.error(`Error updating trust event for ${userId}:`, error);
        }
    }
}
