import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
// Whitelist of fields users are allowed to update on their own profile
const ALLOWED_UPDATE_FIELDS = [
    'displayName', 'bio', 'avatarUrl', 'privacyProfile', 'notificationsOn'
];
export class UsersService {
    async getMe(userId) {
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
        if (!user)
            throw new AppError(404, 'User not found');
        return user;
    }
    async updateMe(userId, data) {
        // Sanitize: only allow whitelisted fields
        const sanitized = {};
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
    async getProfile(handle) {
        const user = await prisma.user.findUnique({
            where: { handle },
            select: {
                id: true,
                displayName: true,
                handle: true,
                bio: true,
                avatarUrl: true,
                onlineStatus: true,
                createdAt: true,
                privacyProfile: true,
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
        if (!user)
            throw new AppError(404, 'User not found');
        // Privacy filter
        if (user.privacyProfile === 'PRIVATE') {
            throw new AppError(403, 'This profile is private');
        }
        return user;
    }
    async searchUsers(query, limit = 20, cursor) {
        return await prisma.user.findMany({
            where: {
                OR: [
                    { handle: { contains: query, mode: 'insensitive' } },
                    { displayName: { contains: query, mode: 'insensitive' } },
                ],
                NOT: [
                    { status: 'BANNED' },
                    { status: 'DELETED' }
                ],
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
