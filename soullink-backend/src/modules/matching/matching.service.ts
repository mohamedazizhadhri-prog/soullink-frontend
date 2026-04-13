import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../shared/utils/logger.js';
import { io } from '../../server.js';
import { AnonymousNamingService } from '../../shared/utils/anonymousNamingService.js';
import {
    INTENT_MATRIX,
    OCEAN_WEIGHTS,
    SUGGESTIONS_PER_DAY,
    SUGGESTION_EXPIRY_H,
    CANDIDATE_POOL_SIZE,
} from './matching.constants.js';
import type {
    CandidateUser,
    CompatibilityResult,
    OceanScoreResult,
    InterestScoreResult,
    UpdatePreferenceDto,
    ActionResult,
} from './matching.types.js';

// ─── CANDIDATE SELECT ─────────────────────────────────────────────────────────
const CANDIDATE_SELECT = {
    id: true, displayName: true, handle: true, avatarUrl: true,
    onlineStatus: true, city: true, country: true,
    personalityProfile: {
        select: {
            openness: true, conscientiousness: true,
            extraversion: true, agreeableness: true, neuroticism: true,
            interests: true,
        },
    },
    novaMemory: { select: { topInterests: true } },
    matchPreference: { select: { intent: true, selectedInterests: true } },
};

export class MatchingService {

    // ─── PUBLIC API ─────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * User joins the matching queue. Triggers immediate matchmaking.
     */
    async joinQueue(userId: string, dto: { intent: any, interests: string[], isQuickMatch: boolean }) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes in queue

        const request = await (prisma as any).matchRequest.upsert({
            where: { userId },
            create: { 
                userId, 
                intent: dto.intent, 
                selectedInterests: dto.interests, 
                isQuickMatch: dto.isQuickMatch, 
                expiresAt 
            },
            update: { 
                intent: dto.intent, 
                selectedInterests: dto.interests, 
                isQuickMatch: dto.isQuickMatch, 
                expiresAt, 
                createdAt: new Date() 
            },
        });

        logger.info(`[Matching] User ${userId} joined queue (${dto.isQuickMatch ? 'Quick' : 'Standard'})`);

        // Trigger matchmaking attempt
        return this.findMatchForUser(userId);
    }

    /**
     * Core matchmaking algorithm.
     */
    private async findMatchForUser(userId: string) {
        const me = await (prisma as any).matchRequest.findUnique({
            where: { userId },
            include: { user: { include: { personalityProfile: true } } }
        });

        if (!me) return null;

        // Find potential partners in the queue
        const potentialPartners = await (prisma as any).matchRequest.findMany({
            where: {
                userId: { not: userId },
                expiresAt: { gt: new Date() },
                // Match intent if standard, or more flexible if quick match
                intent: me.isQuickMatch ? undefined : me.intent
            },
            include: { user: { include: { personalityProfile: true } } }
        });

        if (potentialPartners.length === 0) return null;

        // Filter and sort by compatibility
        let matches = potentialPartners.map((partner: any) => {
            const compatibility = this.computeCompatibility(me.user, partner.user);
            let score = compatibility.total;

            // Prioritize Online for Quick Match
            if (me.isQuickMatch && partner.user.onlineStatus === 'ONLINE') {
                score += 0.2; // Significant boost for being online
            }

            return { partner, score, justification: compatibility.justification };
        });

        // Filter out anyone we already matched with recently
        const recentMatches = await (prisma as any).match.findMany({
            where: { OR: [{ senderId: userId }, { receiverId: userId }] },
            select: { senderId: true, receiverId: true }
        });
        const matchedIds = new Set(recentMatches.flatMap((m: any) => [m.senderId, m.receiverId]));
        
        matches = matches.filter(m => !matchedIds.has(m.partner.userId));

        // Sort by score
        matches.sort((a, b) => b.score - a.score);

        const bestMatch = matches[0];
        if (!bestMatch || (bestMatch.score < 0.5 && !me.isQuickMatch)) return null;

        // Found a match! Create it.
        return this.createMatch(userId, bestMatch.partner.userId, bestMatch.score, bestMatch.justification, me.isQuickMatch);
    }

    private async createMatch(userId: string, partnerId: string, score: number, justification: any, isQuickMatch: boolean) {
        // Remove both from queue
        await (prisma as any).matchRequest.deleteMany({
            where: { userId: { in: [userId, partnerId] } }
        });

        const match = await (prisma as any).match.create({
            data: {
                senderId: userId,
                receiverId: partnerId,
                compatibilityScore: score,
                justification,
                isAnonymous: true,
                anonymousName: AnonymousNamingService.generateRandomName(),
                isQuickMatch,
                status: 'ACCEPTED',
                conversation: { create: {} },
            },
        });

        // Notify both users
        io.to(`user:${userId}`).emit('match:found', { matchId: match.id, partnerName: match.anonymousName });
        io.to(`user:${partnerId}`).emit('match:found', { matchId: match.id, partnerName: match.anonymousName });

        logger.info(`[Matching] Match created: ${userId} <-> ${partnerId} (${match.anonymousName})`);
        return match;
    }

    /**
     * Request or accept identity reveal.
     */
    async revealIdentity(userId: string, matchId: string) {
        const match = await (prisma as any).match.findUnique({
            where: { id: matchId }
        });

        if (!match) throw new AppError(404, 'Match not found');

        // Check if already revealed
        if (match.identityRevealed) return { status: 'success', revealed: true };

        // Add to revealRequestedBy if not already there
        let updatedRequested = match.revealRequestedBy;
        if (!updatedRequested.includes(userId)) {
            updatedRequested = [...updatedRequested, userId];
        }

        const isMutual = updatedRequested.includes(match.senderId) && updatedRequested.includes(match.receiverId);

        const updatedMatch = await (prisma as any).match.update({
            where: { id: matchId },
            data: { 
                revealRequestedBy: updatedRequested,
                identityRevealed: isMutual,
                isAnonymous: !isMutual // if mutual, it's no longer anonymous
            }
        });

        if (isMutual) {
            // Create friendship
            const partnerId = match.senderId === userId ? match.receiverId : match.senderId;
            
            const existingFriendship = await (prisma as any).friendship.findFirst({
                where: {
                    OR: [
                        { senderId: userId, receiverId: partnerId },
                        { senderId: partnerId, receiverId: userId }
                    ]
                }
            });

            if (existingFriendship) {
                await (prisma as any).friendship.update({
                    where: { id: existingFriendship.id },
                    data: { status: 'ACCEPTED' }
                });
            } else {
                await (prisma as any).friendship.create({
                    data: {
                        senderId: userId,
                        receiverId: partnerId,
                        status: 'ACCEPTED'
                    }
                });
            }

            io.to(`user:${match.senderId}`).emit('match:revealed', { matchId });
            io.to(`user:${match.receiverId}`).emit('match:revealed', { matchId });
        }

        return { status: 'success', revealed: isMutual };
    }

    /**
     * Get message history for a match conversation.
     */
    async getMatchMessages(userId: string, matchId: string) {
        const conversation = await (prisma as any).matchConversation.findUnique({
            where: { matchId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        if (!conversation) throw new AppError(404, 'Match conversation not found');

        return conversation.messages;
    }

    /**
     * Send a message in a match conversation.
     */
    async sendMatchMessage(senderId: string, matchId: string, content: string) {
        const conversation = await (prisma as any).matchConversation.findUnique({
            where: { matchId },
            include: { match: true }
        });

        if (!conversation) throw new AppError(404, 'Match conversation not found');

        const message = await (prisma as any).matchMessage.create({
            data: {
                conversationId: conversation.id,
                senderId,
                content
            }
        });

        // Broadcast to both users
        const match = conversation.match;
        const partnerId = match.senderId === senderId ? match.receiverId : match.senderId;

        io.to(`user:${senderId}`).emit('match:message', { matchId, message });
        io.to(`user:${partnerId}`).emit('match:message', { matchId, message });

        return message;
    }

    /**
     * Leave a match (non-destructive termination).
     */
    async terminateMatch(userId: string, matchId: string) {
        await (prisma as any).match.update({
            where: { id: matchId },
            data: { status: 'DECLINED', leftById: userId }
        });

        logger.info(`[Matching] User ${userId} left match ${matchId}`);
        return { status: 'success' };
    }

    /** Returns up to 5 fresh pending suggestions, generating them if needed. */
    async getOrGenerateSuggestions(userId: string) {
        const existing = await (prisma as any).matchSuggestion.findMany({
            where: {
                userId,
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
            include: { candidate: { select: CANDIDATE_SELECT } },
            orderBy: { score: 'desc' },
        });

        if (existing.length >= SUGGESTIONS_PER_DAY) return existing;

        return this.generateSuggestions(userId);
    }

    /** Like or pass on a suggestion. If mutual like → creates a real Match. */
    async actOnSuggestion(userId: string, candidateId: string, action: 'like' | 'pass'): Promise<ActionResult> {
        const suggestion = await (prisma as any).matchSuggestion.findUnique({
            where: { userId_candidateId: { userId, candidateId } },
        });

        if (!suggestion) throw new AppError(404, 'Suggestion not found or expired');
        if (suggestion.status !== 'PENDING') throw new AppError(400, 'Already acted on this suggestion');

        if (action === 'pass') {
            await (prisma as any).matchSuggestion.update({
                where: { id: suggestion.id },
                data: { status: 'PASSED' },
            });
            return { matched: false };
        }

        // Mark as LIKED
        await (prisma as any).matchSuggestion.update({
            where: { id: suggestion.id },
            data: { status: 'LIKED' },
        });

        // Check if the candidate already liked us back
        const theirLike = await (prisma as any).matchSuggestion.findUnique({
            where: { userId_candidateId: { userId: candidateId, candidateId: userId } },
        });

        if (theirLike?.status === 'LIKED') {
            return this.createMutualMatch(userId, candidateId, suggestion);
        }

        return { matched: false };
    }

    /** Get all active accepted matches for a user (for chat list). */
    async getActiveMatches(userId: string) {
        return (prisma as any).match.findMany({
            where: {
                OR: [{ senderId: userId }, { receiverId: userId }],
                status: 'ACCEPTED',
                leftById: null, // Filter out matches that someone left
            },
            include: {
                sender: { select: { id: true, displayName: true, handle: true, avatarUrl: true, onlineStatus: true } },
                receiver: { select: { id: true, displayName: true, handle: true, avatarUrl: true, onlineStatus: true } },
                conversation: {
                    include: {
                        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    /** Get or create the user's match preference row. */
    async getOrCreatePreference(userId: string) {
        return (prisma as any).matchPreference.upsert({
            where: { userId },
            create: { userId },
            update: {},
        });
    }

    /** Update intent, interests, age range, online preference. */
    async updatePreference(userId: string, dto: UpdatePreferenceDto) {
        return (prisma as any).matchPreference.upsert({
            where: { userId },
            create: { userId, ...dto },
            update: { ...dto, lastUpdatedAt: new Date() },
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PRIVATE — SUGGESTION GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    private async generateSuggestions(userId: string) {
        const me = await (prisma as any).user.findUnique({
            where: { id: userId },
            include: {
                personalityProfile: true,
                novaMemory: { select: { topInterests: true } },
                matchPreference: true,
            },
        });

        if (!me) throw new AppError(404, 'User not found');

        // Collect IDs to skip (self + already interacted)
        const [interacted, existingMatches] = await Promise.all([
            (prisma as any).matchSuggestion.findMany({
                where: { userId, status: { in: ['LIKED', 'PASSED', 'MATCHED'] } },
                select: { candidateId: true },
            }),
            (prisma as any).match.findMany({
                where: { OR: [{ senderId: userId }, { receiverId: userId }] },
                select: { senderId: true, receiverId: true },
            }),
        ]);

        const skipIds = new Set<string>([
            userId,
            ...interacted.map((s: any) => s.candidateId),
            ...existingMatches.flatMap((m: any) => [m.senderId, m.receiverId]),
        ]);

        // Fetch candidate pool
        const candidates: CandidateUser[] = await (prisma as any).user.findMany({
            where: {
                id: { notIn: [...skipIds] },
                status: 'ACTIVE',
            },
            select: CANDIDATE_SELECT,
            take: CANDIDATE_POOL_SIZE,
        });

        if (candidates.length === 0) return [];

        // Score + sort + cap at SUGGESTIONS_PER_DAY
        const scored = candidates
            .map((c) => ({ candidate: c, result: this.computeCompatibility(me, c) }))
            .sort((a, b) => b.result.total - a.result.total)
            .slice(0, SUGGESTIONS_PER_DAY);

        const expiresAt = new Date(Date.now() + SUGGESTION_EXPIRY_H * 60 * 60 * 1000);

        // Upsert all suggestions
        const saved = await Promise.all(
            scored.map(({ candidate, result }) =>
                (prisma as any).matchSuggestion.upsert({
                    where: { userId_candidateId: { userId, candidateId: candidate.id } },
                    create: {
                        userId,
                        candidateId: candidate.id,
                        score: result.total,
                        justification: result.justification,
                        status: 'PENDING',
                        expiresAt,
                    },
                    update: {
                        score: result.total,
                        justification: result.justification,
                        status: 'PENDING',
                        expiresAt,
                    },
                    include: { candidate: { select: CANDIDATE_SELECT } },
                })
            )
        );

        logger.info(`[Matching] Generated ${saved.length} suggestions for user ${userId}`);
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PRIVATE — MUTUAL MATCH CREATION
    // ─────────────────────────────────────────────────────────────────────────

    private async createMutualMatch(userId: string, candidateId: string, suggestion: any): Promise<ActionResult> {
        // Mark both suggestions as MATCHED
        await (prisma as any).matchSuggestion.updateMany({
            where: {
                OR: [
                    { userId, candidateId },
                    { userId: candidateId, candidateId: userId },
                ],
            },
            data: { status: 'MATCHED' },
        });

        // Create the Match + MatchConversation atomically
        const match = await (prisma as any).match.create({
            data: {
                senderId: userId,
                receiverId: candidateId,
                compatibilityScore: suggestion.score,
                justification: suggestion.justification,
                isAnonymous: true,
                status: 'ACCEPTED',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                conversation: { create: {} },
            },
        });

        // Real-time notification to both users
        const notifyPayload = { matchId: match.id, score: suggestion.score };
        io.to(`user:${userId}`).emit('match:new', notifyPayload);
        io.to(`user:${candidateId}`).emit('match:new', notifyPayload);

        logger.info(`[Matching] Mutual match created: ${userId} ↔ ${candidateId} (score: ${suggestion.score})`);
        return { matched: true, matchId: match.id };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PRIVATE — COMPATIBILITY ALGORITHM
    // ─────────────────────────────────────────────────────────────────────────

    private computeCompatibility(userA: any, userB: any): CompatibilityResult {
        const intentA: string = userA.matchPreference?.intent ?? 'FRIEND';
        const intentB: string = userB.matchPreference?.intent ?? 'FRIEND';

        const ocean    = this.computeOceanScore(userA, userB, intentA);
        const interest = this.computeInterestScore(userA, userB);
        const intent   = INTENT_MATRIX[intentA]?.[intentB] ?? 0.5;

        const total = Math.round(((0.60 * ocean.score) + (0.25 * interest.score) + (0.15 * intent)) * 100) / 100;

        return {
            total,
            justification: this.buildJustification(total, ocean, interest, intent, intentA, intentB),
        };
    }

    /** Weighted OCEAN similarity with intent-aware weights + extraversion complementarity blend. */
    private computeOceanScore(userA: any, userB: any, intent: string): OceanScoreResult {
        const pA = userA.personalityProfile;
        const pB = userB.personalityProfile;

        if (!pA || !pB) return { score: 0.5, detail: 'No personality data yet — based on defaults' };

        const w = OCEAN_WEIGHTS[intent] ?? OCEAN_WEIGHTS['FRIEND'];

        const O = 1 - Math.abs(pA.openness          - pB.openness);
        const C = 1 - Math.abs(pA.conscientiousness - pB.conscientiousness);
        const A = 1 - Math.abs(pA.agreeableness     - pB.agreeableness);
        const N = 1 - Math.abs(pA.neuroticism       - pB.neuroticism);

        // Extraversion: blend similar (65%) + complementary (35%)
        // → introvert+extrovert pairs can thrive, so complement gets a weight
        const E_sim  = 1 - Math.abs(pA.extraversion - pB.extraversion);
        const E_comp = 1 - Math.abs(pA.extraversion - (1 - pB.extraversion));
        const E      = 0.65 * E_sim + 0.35 * E_comp;

        const score = Math.round((w.O * O + w.C * C + w.E * E + w.A * A + w.N * N) * 100) / 100;

        return { score, traits: { O, C, E, A, N } };
    }

    /** Jaccard similarity across combined Nova-extracted + picker-selected interests. */
    private computeInterestScore(userA: any, userB: any): InterestScoreResult {
        const normalize = (arr: string[]) => arr.map((s) => s.toLowerCase().trim());

        const setA = new Set<string>([
            ...normalize(userA.novaMemory?.topInterests ?? []),
            ...normalize(userA.matchPreference?.selectedInterests ?? []),
        ]);
        const setB = new Set<string>([
            ...normalize(userB.novaMemory?.topInterests ?? []),
            ...normalize(userB.matchPreference?.selectedInterests ?? []),
        ]);

        if (setA.size === 0 || setB.size === 0) return { score: 0.5, shared: [] };

        const shared = [...setA].filter((i) => setB.has(i));
        const union  = new Set([...setA, ...setB]).size;
        const score  = Math.round((shared.length / union) * 100) / 100;

        return { score, shared: shared.slice(0, 6) };
    }

    /** Generates a human-readable justification object for the match card UI. */
    private buildJustification(
        total: number,
        ocean: OceanScoreResult,
        interests: InterestScoreResult,
        intent: number,
        intentA: string,
        intentB: string,
    ) {
        const highlights: string[] = [];

        if ((ocean.traits?.O ?? 0) > 0.75) highlights.push('Both of you are deeply open-minded and curious');
        if ((ocean.traits?.A ?? 0) > 0.80) highlights.push('You share a rare warmth and kindness');
        if ((ocean.traits?.C ?? 0) > 0.75) highlights.push('Both value discipline and follow-through');
        if ((ocean.traits?.N ?? 0) > 0.80) highlights.push('Your emotional energy balances each other');
        if (interests.shared.length > 0)  highlights.push(`You both love: ${interests.shared.join(', ')}`);
        if (intentA === intentB)           highlights.push('Both looking for the same kind of connection');

        const getLabel = (s: number) => {
            if (s >= 0.85) return 'Exceptionally aligned souls';
            if (s >= 0.70) return 'Strong personality match';
            if (s >= 0.55) return 'Good compatibility';
            return 'Different but interesting perspectives';
        };

        return {
            score: Math.round(total * 100),
            breakdown: {
                ocean: {
                    score: Math.round(ocean.score * 100),
                    label: ocean.detail ?? getLabel(ocean.score),
                },
                interests: {
                    score: Math.round(interests.score * 100),
                    shared: interests.shared,
                    label: interests.shared.length > 0
                        ? `${interests.shared.length} shared passion${interests.shared.length > 1 ? 's' : ''}`
                        : 'Discover new interests together',
                },
                intent: {
                    score: Math.round(intent * 100),
                    label: intentA === intentB ? 'Perfectly aligned goals' : 'Different but compatible goals',
                },
            },
            highlights: highlights.slice(0, 3),
        };
    }
}

export const matchingService = new MatchingService();
