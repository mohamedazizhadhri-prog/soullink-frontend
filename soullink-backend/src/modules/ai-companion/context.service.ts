// src/modules/ai-companion/context.service.ts
import { prisma } from '../../config/database.js';
import { AI_CONFIG } from './ai.constants.js';

interface ContextCache {
    data: string;
    expiresAt: number;
}

export class ContextService {
    private cache = new Map<string, ContextCache>();

    async getUserContext(userId: string, currentMessage?: string, timezoneOverride?: string): Promise<string> {
        // 1. Check Cache
        const cached = this.cache.get(userId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        // 2. Fetch Optimized Context (Parallel Queries)
        const [user, activeProgress, recentResponses, friendshipsCount] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                include: {
                    novaMemory: true,
                    personalityProfile: true,
                }
            }),
            prisma.soulGameProgress.findFirst({
                where: { userId, isCompleted: false },
                orderBy: { updatedAt: 'desc' },
                include: {
                    game: true,
                    currentScene: { include: { choices: true } }
                }
            }),
            prisma.gameResponse.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { game: true, scene: true, choice: true }
            }),
            prisma.friendship.count({
                where: {
                    OR: [{ senderId: userId }, { receiverId: userId }],
                    status: 'ACCEPTED'
                }
            })
        ]);

        if (!user) return "User profile not found.";

        const lines: string[] = [];
        lines.push(`USER PROFILE:`);
        lines.push(`- Real Name: ${user.displayName || 'Unknown'}`);
        lines.push(`- Location: ${user.city || user.novaMemory?.city || 'Unknown'}, ${user.country || user.novaMemory?.country || 'Unknown'}`);
        if (timezoneOverride) lines.push(`- Current Local Timezone: ${timezoneOverride}`);

        // Nova Memory
        if (user.novaMemory) {
            const mem = user.novaMemory;
            lines.push(`\nNOVA'S INTERNAL MEMORY:`);
            lines.push(`- Nickname: ${mem.nickname || 'None'}`);
            lines.push(`- Relationship: ${mem.friendshipStage} (Trust: ${mem.trustLevel}/100)`);
            if (mem.currentMood) lines.push(`- User Mood: ${mem.currentMood} (${mem.emotionalTrend})`);

            const kw = currentMessage?.toLowerCase() || '';
            const struggleTriggers = ['struggle', 'pain', 'hurting', 'sad', 'depressed', 'anxious', 'worried', 'problem'];
            const interestTriggers = ['hobby', 'interest', 'love', 'like doing', 'fan of', 'obsessed with'];

            if (struggleTriggers.some(t => kw.includes(t)) && mem.currentStruggles.length) {
                lines.push(`- Struggles: ${mem.currentStruggles.join(', ')}`);
            }
            if (interestTriggers.some(t => kw.includes(t)) && mem.topInterests.length) {
                lines.push(`- Interests (matching query): ${mem.topInterests.join(', ')}`);
            }
        }

        // Personality
        if (user.personalityProfile) {
            const p = user.personalityProfile;
            lines.push(`\nPERSONALITY:`);
            const personalityText = [
                `Openness(${(p.openness * 100).toFixed(0)}%)`,
                `Conscientious(${(p.conscientiousness * 100).toFixed(0)}%)`,
                `Extravert(${(p.extraversion * 100).toFixed(0)}%)`,
                `Agreeable(${(p.agreeableness * 100).toFixed(0)}%)`,
                `Neurotic(${(p.neuroticism * 100).toFixed(0)}%)`
            ].join(', ');
            lines.push(`- Traits: ${personalityText}`);
        }

        // Active Gaming
        if (activeProgress) {
            lines.push(`\nACTIVE GAME:`);
            lines.push(`- Currently playing: Scene ${activeProgress.currentScene?.sceneOrder} of '${activeProgress.game.title}'`);
            lines.push(`- Scene text: "${activeProgress.currentScene?.text}"`);
        }

        // History
        if (recentResponses.length) {
            lines.push(`\nRECENT GAME CHOICES:`);
            recentResponses.forEach(rr => {
                lines.push(`- Chose "${rr.choice.text}" in ${rr.game.title} (Scene ${rr.scene.sceneOrder})`);
            });
        }

        lines.push(`\nSOCIAL: ${friendshipsCount} friends.`);

        const contextText = lines.join('\n');

        // 3. Update Cache
        this.cache.set(userId, {
            data: contextText,
            expiresAt: Date.now() + AI_CONFIG.CONTEXT_CACHE_TTL
        });

        return contextText;
    }
}

export const contextService = new ContextService();
