/**
 * ReportsService — User-facing report submission
 *
 * Rules:
 *  - Users cannot report themselves.
 *  - Rate limit: max 5 reports per 24 hours per reporter (soft guard).
 *  - Duplicate guard: identical (reporterId, reportedId, category) that is
 *    PENDING or UNDER_REVIEW is rejected with 409.
 *  - Evidence is stored as ReportEvidence records (Cloudinary URLs).
 */

import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export class ReportsService {

    /** Submit a new report against another user */
    async submitReport(params: {
        reporterId: string;
        reportedId: string;
        category: string;
        description: string;
        contextType?: string;
        contextId?: string;
        evidenceUrls?: { url: string; type?: string; caption?: string }[];
    }) {
        const { reporterId, reportedId, category, description, contextType, contextId, evidenceUrls } = params;

        // Cannot report yourself
        if (reporterId === reportedId) {
            throw new AppError(400, 'You cannot report yourself');
        }

        // Verify reported user exists
        const target = await prisma.user.findUnique({ where: { id: reportedId }, select: { id: true } });
        if (!target) throw new AppError(404, 'User not found');

        // Rate limit: max 5 reports per 24h
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCount = await prisma.report.count({
            where: { reporterId, createdAt: { gte: dayAgo } },
        });
        if (recentCount >= 5) {
            throw new AppError(429, 'You can only submit 5 reports per 24 hours');
        }

        // Duplicate guard: same category + same target already open
        const duplicate = await prisma.report.findFirst({
            where: {
                reporterId,
                reportedId,
                category: category as any,
                status: { in: ['PENDING', 'UNDER_REVIEW'] },
            },
        });
        if (duplicate) {
            throw new AppError(409, 'You already have an open report against this user for this category');
        }

        // Create the report
        const report = await prisma.report.create({
            data: {
                reporterId,
                reportedId,
                category: category as any,
                description,
                contextType: contextType as any ?? null,
                contextId: contextId ?? null,
            },
        });

        // Attach evidence records if provided
        if (evidenceUrls && evidenceUrls.length > 0) {
            await prisma.reportEvidence.createMany({
                data: evidenceUrls.map(e => ({
                    reportId: report.id,
                    type: e.type ?? 'SCREENSHOT',
                    url: e.url,
                    caption: e.caption ?? null,
                })),
            });
        }

        return report;
    }

    /** Upload a single evidence file to an existing report */
    async addEvidence(reportId: string, userId: string, fileUrl: string, caption?: string) {
        const report = await prisma.report.findUnique({ where: { id: reportId } });
        if (!report) throw new AppError(404, 'Report not found');
        if (report.reporterId !== userId) throw new AppError(403, 'You can only add evidence to your own reports');

        // Max 5 pieces of evidence per report
        const count = await prisma.reportEvidence.count({ where: { reportId } });
        if (count >= 5) throw new AppError(400, 'Maximum 5 pieces of evidence per report');

        return prisma.reportEvidence.create({
            data: { reportId, type: 'SCREENSHOT', url: fileUrl, caption: caption ?? null },
        });
    }

    /** Get all reports submitted by the authenticated user */
    async getMyReports(userId: string, page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [reports, total] = await Promise.all([
            prisma.report.findMany({
                where: { reporterId: userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    reported: { select: { id: true, displayName: true, handle: true, avatarUrl: true } },
                    evidences: true,
                    appeal: true,
                },
            }),
            prisma.report.count({ where: { reporterId: userId } }),
        ]);

        return { reports, total, page, limit, pages: Math.ceil(total / limit) };
    }
}
