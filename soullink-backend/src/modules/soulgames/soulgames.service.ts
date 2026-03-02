import { prisma as prismaClient } from '../../config/database.js';
const prisma = prismaClient as any;
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../shared/utils/logger.js';
import { AIService } from '../ai-companion/ai.service.js';

export class SoulGamesService {
    private aiService = new AIService();

    /**
     * Get all episodes with the user's completion status
     */
    async getAllGames(userId: string, limit = 50, cursor?: string) {
        let games = [];
        try {
            games = await prisma.soulGame.findMany({
                where: { isActive: true },
                take: Math.min(limit, 100),
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { orderIndex: 'asc' },
                include: {
                    _count: { select: { scenes: true } },
                },
            });
        } catch (error) {
            logger.error('[SoulGames] Error fetching games:', (error as any).message);
            throw new AppError(500, 'Failed to fetch Soul Games list. Please try again later.');
        }

        // Get user's explicit progress
        let explicitProgress: any[] = [];
        try {
            explicitProgress = await prisma.soulGameProgress.findMany({
                where: { userId },
            });
        } catch (error) {
            logger.warn('[SoulGames] Error fetching explicitProgress (schema mismatch?):', (error as any).message);
        }
        const completedGameIds = new Set(explicitProgress.filter((p: any) => p.isCompleted).map((p: any) => p.gameId));

        // Get user profile for auto-healing mandatory games
        let user: any = null;
        try {
            user = await prisma.user.findUnique({
                where: { id: userId },
                select: { status: true, personalityProfile: true }
            });
        } catch (error) {
            logger.warn('[SoulGames] Error fetching user profile for auto-heal:', (error as any).message);
        }

        // Get response counts per game for progress bar
        let responseMap = new Map();
        try {
            const responseCounts = await prisma.gameResponse.groupBy({
                by: ['gameId'],
                where: { userId },
                _count: { id: true },
            });
            responseMap = new Map(responseCounts.map((r: any) => [r.gameId, r._count.id]));
        } catch (error) {
            logger.warn('[SoulGames] Error fetching response counts:', (error as any).message);
        }

        const results = games.map((game: any) => {
            const totalScenes = game._count.scenes;
            const answered = responseMap.get(game.id) || 0;

            // Completion Logic:
            // 1. Explicitly marked as completed in new table
            // 2. OR dynamic count matches (legacy fallback)
            // 3. OR Auto-heal: If user is ACTIVE and it's a mandatory game, they MUST have finished it
            const isCompleted = completedGameIds.has(game.id) ||
                (answered >= totalScenes && totalScenes > 0) ||
                (game.mandatory && user?.status === 'ACTIVE' && !!user?.personalityProfile);

            return {
                id: game.id,
                slug: game.slug,
                title: game.title,
                description: game.description,
                theme: (game as any).theme,
                color: game.color,
                icon: game.icon,
                episode: game.episode,
                mandatory: game.mandatory,
                totalScenes,
                answeredScenes: answered,
                isCompleted,
                isLocked: false, // Calculated in pass 2
            };
        });

        // Pass 2: A game is locked if the previous game exists and is NOT completed
        for (let i = 1; i < results.length; i++) {
            results[i].isLocked = !results[i - 1].isCompleted;
        }

        return results;
    }

    /**
     * Track which scene the user is currently viewing
     */
    async trackSceneView(userId: string, gameId: string, sceneId: string) {
        return await prisma.soulGameProgress.upsert({
            where: { userId_gameId: { userId, gameId } },
            create: { userId, gameId, currentSceneId: sceneId },
            update: { currentSceneId: sceneId, updatedAt: new Date() },
        });
    }

    /**
     * Get a single game with all its scenes and choices
     */
    async getGameById(gameId: string, userId: string) {
        const game = await prisma.soulGame.findUnique({
            where: { id: gameId },
            include: {
                scenes: {
                    orderBy: { sceneOrder: 'asc' },
                    include: {
                        choices: { orderBy: { orderIndex: 'asc' } },
                    },
                },
            },
        });

        if (!game) throw new AppError(404, 'Soul Game not found');

        // Get user's existing responses for this game
        const responses = await prisma.gameResponse.findMany({
            where: { userId, gameId },
            select: { sceneId: true, choiceId: true },
        });
        const answeredMap = new Map(responses.map((r: any) => [r.sceneId, r.choiceId]));

        return {
            ...game,
            scenes: game.scenes.map((scene: any) => ({
                ...scene,
                answeredChoiceId: answeredMap.get(scene.id) || null,
            })),
        };
    }

    /**
     * Submit a response to a scene
     */
    async submitResponse(
        userId: string,
        gameId: string,
        sceneId: string,
        choiceId: string,
        responseTimeMs: number,
        emotionalNote?: string
    ) {
        // Validate that scene belongs to game
        const scene = await prisma.gameScene.findFirst({
            where: { id: sceneId, gameId },
        });
        if (!scene) throw new AppError(400, 'Scene does not belong to this game');

        // Validate choice belongs to scene
        const choice = await prisma.gameChoice.findFirst({
            where: { id: choiceId, sceneId },
        });
        if (!choice) throw new AppError(400, 'Choice does not belong to this scene');

        // Upsert: allow re-answering a scene
        const existing = await prisma.gameResponse.findFirst({
            where: { userId, gameId, sceneId },
        });

        if (existing) {
            return await prisma.gameResponse.update({
                where: { id: existing.id },
                data: { choiceId, responseTimeMs, emotionalNote },
            });
        }

        return await prisma.gameResponse.create({
            data: {
                userId,
                gameId,
                sceneId,
                choiceId,
                responseTimeMs,
                emotionalNote,
            },
        });
    }

    /**
     * Complete a game and recalculate the personality profile
     */
    async completeGame(userId: string, gameId: string) {
        const game = await prisma.soulGame.findUnique({
            where: { id: gameId },
            include: { _count: { select: { scenes: true } } },
        });
        if (!game) throw new AppError(404, 'Soul Game not found');

        // Check all scenes are answered
        const responses = await prisma.gameResponse.findMany({
            where: { userId, gameId },
            include: {
                choice: true,
            },
        });

        if (responses.length < game._count.scenes) {
            throw new AppError(400, `Please answer all ${game._count.scenes} scenes before completing`);
        }

        // Create or update explicit progress record
        await prisma.soulGameProgress.upsert({
            where: { userId_gameId: { userId, gameId } },
            create: { userId, gameId, isCompleted: true, completedAt: new Date() },
            update: { isCompleted: true, completedAt: new Date() },
        });

        // Calculate Big Five scores from this game's responses
        const scores = this.calculateScores(responses);
        // ... (rest of the personality profile logic)

        // Get or create personality profile, then merge scores
        const existingProfile = await prisma.personalityProfile.findUnique({
            where: { userId },
        });

        if (existingProfile) {
            // Weighted merge: blend new scores with existing ones
            const weight = 0.5; // Give equal weight to old and new
            await prisma.personalityProfile.update({
                where: { userId },
                data: {
                    openness: existingProfile.openness * (1 - weight) + scores.openness * weight,
                    conscientiousness: existingProfile.conscientiousness * (1 - weight) + scores.conscientiousness * weight,
                    extraversion: existingProfile.extraversion * (1 - weight) + scores.extraversion * weight,
                    agreeableness: existingProfile.agreeableness * (1 - weight) + scores.agreeableness * weight,
                    neuroticism: existingProfile.neuroticism * (1 - weight) + scores.neuroticism * weight,
                    lastCalculatedAt: new Date(),
                },
            });
        } else {
            await prisma.personalityProfile.create({
                data: {
                    userId,
                    openness: scores.openness,
                    conscientiousness: scores.conscientiousness,
                    extraversion: scores.extraversion,
                    agreeableness: scores.agreeableness,
                    neuroticism: scores.neuroticism,
                    lastCalculatedAt: new Date(),
                },
            });
        }

        // If mandatory episode, upgrade user status
        if (game.mandatory) {
            await prisma.user.update({
                where: { id: userId },
                data: { status: 'ACTIVE' },
            });
        }

        // Trigger Proactive AI Message for game completion
        this.aiService.generateProactiveMessage(userId, 'game_completed').catch(err =>
            console.error('Failed to trigger proactive message:', err)
        );

        // Return updated profile
        return await prisma.personalityProfile.findUnique({ where: { userId } });
    }

    /**
     * Calculate Big Five scores from game responses
     * Maps choice weights to 0.0–1.0 scale
     */
    private calculateScores(responses: any[]) {
        const domains: Record<string, number[]> = {
            O: [], C: [], E: [], A: [], N: [],
        };

        for (const response of responses) {
            const choice = response.choice;
            // Each choice has openness, conscientiousness, etc. weights (0-5 scale)
            if (choice.openness !== 0) domains.O.push(choice.openness);
            if (choice.conscientiousness !== 0) domains.C.push(choice.conscientiousness);
            if (choice.extraversion !== 0) domains.E.push(choice.extraversion);
            if (choice.agreeableness !== 0) domains.A.push(choice.agreeableness);
            if (choice.neuroticism !== 0) domains.N.push(choice.neuroticism);
        }

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length / 5 : 0.5;

        return {
            openness: avg(domains.O),
            conscientiousness: avg(domains.C),
            extraversion: avg(domains.E),
            agreeableness: avg(domains.A),
            neuroticism: avg(domains.N),
        };
    }

    /**
     * Get user's personality profile
     */
    async getPersonalityProfile(userId: string) {
        const profile = await prisma.personalityProfile.findUnique({
            where: { userId },
        });
        if (!profile) throw new AppError(404, 'No personality profile found. Complete a Soul Game first!');
        return profile;
    }
}
