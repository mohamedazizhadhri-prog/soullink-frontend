import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

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

    async updateMe(userId: string, data: any) {
        return await prisma.user.update({
            where: { id: userId },
            data,
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

    async getProfile(handle: string) {
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
                privacyBio: true,
                personalityProfile: {
                    select: {
                        mbtiType: true,
                        insights: true,
                    }
                }
            }
        });

        if (!user) throw new AppError(404, 'User not found');

        // Privacy filter (simplified)
        if (user.privacyProfile === 'PRIVATE') {
            throw new AppError(403, 'This profile is private');
        }

        return user;
    }

    async searchUsers(query: string) {
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
            take: 20,
        });
    }
}
