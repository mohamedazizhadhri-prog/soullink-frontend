/**
 * FeedbackService — User feedback submission & admin reply management
 */

import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export class FeedbackService {

    /** Submit a new feedback item */
    async createFeedback(params: {
        userId: string;
        title: string;
        content: string;
        category: string;
    }) {
        const { userId, title, content, category } = params;

        if (!title?.trim()) throw new AppError(400, 'Title is required');
        if (!content?.trim()) throw new AppError(400, 'Content is required');

        const validCategories = ['BUG', 'IDEA', 'IMPROVEMENT', 'OTHER'];
        const cat = (category?.toUpperCase() || 'OTHER');
        if (!validCategories.includes(cat)) throw new AppError(400, 'Invalid feedback category');

        // Rate limit: max 10 feedbacks per 24h per user
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCount = await prisma.feedback.count({
            where: { userId, createdAt: { gte: dayAgo } },
        });
        if (recentCount >= 10) {
            throw new AppError(429, 'You can submit at most 10 feedbacks per day');
        }

        return prisma.feedback.create({
            data: {
                userId,
                title: title.trim(),
                content: content.trim(),
                category: cat as any,
                status: 'PENDING',
            },
        });
    }

    /** Get feedbacks submitted by the authenticated user */
    async getMyFeedback(userId: string) {
        return prisma.feedback.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /** Get all feedbacks — admin/moderator only */
    async getAllFeedback(params: {
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const { status, search, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status && status !== 'ALL') where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [feedbacks, total] = await Promise.all([
            prisma.feedback.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, displayName: true, handle: true, avatarUrl: true },
                    },
                },
            }),
            prisma.feedback.count({ where }),
        ]);

        return { feedbacks, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /** Reply to a feedback item — admin/moderator only */
    async replyToFeedback(feedbackId: string, responderId: string, reply: string) {
        if (!reply?.trim()) throw new AppError(400, 'Reply text is required');

        const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } });
        if (!feedback) throw new AppError(404, 'Feedback not found');

        return prisma.feedback.update({
            where: { id: feedbackId },
            data: {
                reply: reply.trim(),
                repliedAt: new Date(),
                repliedById: responderId,
                status: 'REPLIED',
            },
        });
    }

    /** Close a feedback item — admin/moderator only */
    async closeFeedback(feedbackId: string) {
        const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } });
        if (!feedback) throw new AppError(404, 'Feedback not found');

        return prisma.feedback.update({
            where: { id: feedbackId },
            data: { status: 'CLOSED' },
        });
    }
}
