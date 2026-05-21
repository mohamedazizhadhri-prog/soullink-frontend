import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service.js';
import { AppError } from '../../middleware/errorHandler.js';

const svc = new ReportsService();

/** POST /api/reports — submit a report */
export const submitReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { reportedId, category, description, contextType, contextId, evidenceUrls } = req.body;

        if (!reportedId || !category || !description) {
            throw new AppError(400, 'reportedId, category, and description are required');
        }
        if (description.length < 10) {
            throw new AppError(400, 'Description must be at least 10 characters');
        }

        const report = await svc.submitReport({
            reporterId: userId,
            reportedId,
            category,
            description,
            contextType,
            contextId,
            evidenceUrls,
        });

        res.status(201).json({ status: 'success', data: { report } });
    } catch (err) {
        next(err);
    }
};

/** POST /api/reports/:id/evidence — upload a screenshot to an existing report */
export const uploadEvidence = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const file = (req as any).file;

        if (!file) throw new AppError(400, 'No file uploaded');

        const evidence = await svc.addEvidence(id, userId, file.path, req.body.caption);
        res.status(201).json({ status: 'success', data: { evidence } });
    } catch (err) {
        next(err);
    }
};

/** GET /api/reports/my — get the authenticated user's submitted reports */
export const getMyReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const page  = parseInt(String(req.query.page  ?? '1'),  10);
        const limit = parseInt(String(req.query.limit ?? '20'), 10);

        const data = await svc.getMyReports(userId, page, limit);
        res.status(200).json({ status: 'success', data });
    } catch (err) {
        next(err);
    }
};
