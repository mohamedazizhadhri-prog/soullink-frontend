import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export class SoulGamesService {

    /**
     * Get all episodes with the user's completion status
     */
    async getAllGames(userId: string) {
        const games = await prisma.soulGame.findMany({
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' },
            include: {
                _count: { select: { scenes: true } },
            },
        });

        // Get user's completed games
        const completedGameIds = await prisma.gameResponse.findMany({
            where: { userId },
            select: { gameId: true },
            distinct: ['gameId'],
        });
        const completedSet = new Set(completedGameIds.map(r => r.gameId));

        // Get response counts per game for progress
        const responseCounts = await prisma.gameResponse.groupBy({
            by: ['gameId'],
            where: { userId },
            _count: { id: true },
        });
        const responseMap = new Map(responseCounts.map(r => [r.gameId, r._count.id]));

        return games.map((game, index) => {
            const totalScenes = game._count.scenes;
            const answered = responseMap.get(game.id) || 0;
            const isCompleted = answered >= totalScenes && totalScenes > 0;

            // Episode unlocks if: it's the first one, or the previous one is completed
            const previousGame = index > 0 ? games[index - 1] : null;
            const previousCompleted = previousGame
                ? (responseMap.get(previousGame.id) || 0) >= (previousGame._count.scenes || 0) && previousGame._count.scenes > 0
                : true;

            return {
                id: game.id,
                slug: game.slug,
                title: game.title,
                description: game.description,
                theme: game.theme,
                color: game.color,
                icon: game.icon,
                episode: game.episode,
                mandatory: game.mandatory,
                totalScenes,
                answeredScenes: answered,
                isCompleted,
                isLocked: !previousCompleted && index > 0,
            };
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
        const answeredMap = new Map(responses.map(r => [r.sceneId, r.choiceId]));

        return {
            ...game,
            scenes: game.scenes.map(scene => ({
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

        // Calculate Big Five scores from this game's responses
        const scores = this.calculateScores(responses);

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
