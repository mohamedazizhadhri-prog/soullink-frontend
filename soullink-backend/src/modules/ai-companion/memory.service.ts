import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';
import { llmService } from './llm.service.js';
import { MODELS } from './ai.constants.js';

export type TrustEvent =
    | 'shared_secret'
    | 'daily_checkin'
    | 'emotional_moment'
    | 'insult'
    | 'long_conversation'
    | 'returned_after_absence'
    | 'completed_game'
    | 'interest_action'
    | 'social_connection';

const TRUST_EVENTS: Record<TrustEvent, number> = {
    shared_secret: 8,
    daily_checkin: 2,
    emotional_moment: 5,
    insult: -10,
    long_conversation: 3,
    returned_after_absence: 4,
    completed_game: 6,
    interest_action: 1,
    social_connection: 2,
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
     * Extracts structured user facts and updates the `NovaUserMemory` model.
     */
    async extractFactsAndUpdateMemory(userId: string, recentMessages: { role: string; content: string }[]) {
        if (recentMessages.length === 0) return;

        try {
            const conversationText = recentMessages
                .map(m => `${m.role === 'user' ? 'User' : 'Nova'}: ${m.content}`)
                .join('\n');

            const SYSTEM_PROMPT = `
You are Nova's internal memory processing module.
Extract structured facts about the user from the conversation snippet.
Return exactly valid JSON. If unsure, omit keys.
JSON keys: nickname, occupation, city, country, currentMood, emotionalTrend, topInterests, lifeGoals, currentStruggles, importantPeople, lastTopicDiscussed, insideJokes, preferredTone.
`;

            const jsonContent = await llmService.call(
                SYSTEM_PROMPT,
                conversationText,
                MODELS.LIGHT,
                0.1,
                400,
                { type: "json_object" }
            );

            if (!jsonContent) return;

            let extracted: any;
            try {
                extracted = JSON.parse(jsonContent);
            } catch (e) {
                logger.error('Fact extraction failed to parse JSON', e);
                return;
            }

            let memory = await prisma.novaUserMemory.findUnique({ where: { userId } });
            if (!memory) {
                const user = await prisma.user.findUnique({ where: { id: userId }, select: { city: true, country: true } });
                memory = await prisma.novaUserMemory.create({
                    data: { userId, city: user?.city, country: user?.country }
                });
            }

            const mergeUnique = (oldArr: string[], newArr: string[]) => Array.from(new Set([...(oldArr || []), ...(newArr || [])]));

            await prisma.novaUserMemory.update({
                where: { userId },
                data: {
                    nickname: extracted.nickname || memory.nickname,
                    occupation: extracted.occupation || memory.occupation,
                    city: extracted.city || memory.city,
                    country: extracted.country || memory.country,
                    currentMood: extracted.currentMood || memory.currentMood,
                    emotionalTrend: extracted.emotionalTrend || memory.emotionalTrend,
                    topInterests: extracted.topInterests?.length ? mergeUnique(memory.topInterests as string[], extracted.topInterests) : memory.topInterests as string[],
                    lifeGoals: extracted.lifeGoals?.length ? mergeUnique(memory.lifeGoals as string[], extracted.lifeGoals) : memory.lifeGoals as string[],
                    currentStruggles: extracted.currentStruggles?.length ? mergeUnique(memory.currentStruggles as string[], extracted.currentStruggles) : memory.currentStruggles as string[],
                    importantPeople: extracted.importantPeople?.length ? mergeUnique(memory.importantPeople as string[], extracted.importantPeople) : memory.importantPeople as string[],
                    lastTopicDiscussed: extracted.lastTopicDiscussed || memory.lastTopicDiscussed,
                    insideJokes: extracted.insideJokes?.length ? mergeUnique(memory.insideJokes as string[], extracted.insideJokes) : memory.insideJokes as string[],
                    preferredTone: extracted.preferredTone || memory.preferredTone,
                }
            });

            logger.info(`Updated structured memory for user ${userId}`);
        } catch (error) {
            logger.error('Error extracting memory facts:', error);
        }
    }

    /**
     * Adjusts the trust level based on a specific event.
     */
    async recordTrustEvent(userId: string, eventType: TrustEvent) {
        try {
            let memory = await prisma.novaUserMemory.findUnique({ where: { userId } });
            if (!memory) {
                memory = await prisma.novaUserMemory.create({ data: { userId } });
            }

            const delta = TRUST_EVENTS[eventType];
            const newTrust = Math.min(100, Math.max(0, memory.trustLevel + delta));
            const newStage = getFriendshipStage(newTrust);

            await prisma.novaUserMemory.update({
                where: { userId },
                data: { trustLevel: newTrust, friendshipStage: newStage }
            });

            logger.info(`Recorded trust event ${eventType} for ${userId} (Trust: ${newTrust})`);
        } catch (error) {
            logger.error(`Error updating trust event for ${userId}:`, error);
        }
    }
}

export const memoryService = new MemoryService();
