import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

// Whitelist of fields users are allowed to update on their own profile
const ALLOWED_UPDATE_FIELDS = [
    'displayName', 'bio', 'avatarUrl', 'bannerUrl', 'privacyProfile', 'notificationsOn'
];

export class UsersService {
    async getMe(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                personalityProfile: true,
                _count: {
                    select: {
                        sentFriendships: { where: { status: 'ACCEPTED' } },
                        receivedFriendships: { where: { status: 'ACCEPTED' } },
                        gameResponses: true,
                    }
                }
            }
        });

        if (!user) throw new AppError(404, 'User not found');
        return user;
    }

    async updateMe(userId: string, data: Record<string, any>) {
        // Sanitize: only allow whitelisted fields
        const sanitized: Record<string, any> = {};
        for (const key of ALLOWED_UPDATE_FIELDS) {
            if (data[key] !== undefined) {
                sanitized[key] = data[key];
            }
        }

        if (Object.keys(sanitized).length === 0) {
            throw new AppError(400, 'No valid fields to update');
        }

        return await prisma.user.update({
            where: { id: userId },
            data: sanitized,
            include: {
                personalityProfile: true,
                _count: {
                    select: {
                        sentFriendships: { where: { status: 'ACCEPTED' } },
                        receivedFriendships: { where: { status: 'ACCEPTED' } },
                        gameResponses: true,
                    }
                }
            }
        });
    }

    async getProfile(handle: string, currentUserId?: string) {
        const user = await prisma.user.findUnique({
            where: { handle },
            select: {
                id: true,
                displayName: true,
                handle: true,
                bio: true,
                avatarUrl: true,
                bannerUrl: true,
                onlineStatus: true,
                createdAt: true,
                privacyProfile: true,
                status: true,
                personalityProfile: {
                    select: {
                        openness: true,
                        conscientiousness: true,
                        extraversion: true,
                        agreeableness: true,
                        neuroticism: true,
                        insights: true,
                    }
                }
            }
        });

        if (!user || user.status !== 'ACTIVE') throw new AppError(404, 'User not found');

        // Privacy filter
        if (user.privacyProfile === 'PRIVATE' && currentUserId !== user.id) {
            // Check if they are friends
            if (currentUserId) {
                const friendship = await prisma.friendship.findFirst({
                    where: {
                        OR: [
                            { senderId: currentUserId, receiverId: user.id, status: 'ACCEPTED' },
                            { senderId: user.id, receiverId: currentUserId, status: 'ACCEPTED' }
                        ]
                    }
                });
                if (!friendship) throw new AppError(403, 'This profile is private');
            } else {
                throw new AppError(403, 'This profile is private');
            }
        }

        let relationship = null;
        if (currentUserId && currentUserId !== user.id) {
            const rel = await prisma.friendship.findFirst({
                where: {
                    OR: [
                        { senderId: currentUserId, receiverId: user.id },
                        { senderId: user.id, receiverId: currentUserId }
                    ]
                }
            });

            if (rel) {
                if (rel.status === 'ACCEPTED') relationship = 'FRIEND';
                else if (rel.status === 'PENDING') {
                    relationship = rel.senderId === currentUserId ? 'SENT' : 'RECEIVED';
                } else if (rel.status === 'BLOCKED') relationship = 'BLOCKED';
            } else {
                relationship = 'NONE';
            }
        }

        return { ...user, relationship };
    }

    async searchUsers(query: string, limit = 20, cursor?: string) {
        return await prisma.user.findMany({
            where: {
                OR: [
                    { handle: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } },
                ],
                status: 'ACTIVE',
            },
            select: {
                id: true,
                displayName: true,
                handle: true,
                avatarUrl: true,
            },
            take: Math.min(limit, 50),
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
        });
    }
}
