import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { AppError } from '../../middleware/errorHandler.js';

const usersService = new UsersService();

export class UsersController {
    async getMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.getMe(req.user!.id);
            res.status(200).json({ status: 'success', data: { user } });
        } catch (error) {
            next(error);
        }
    }

    async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const user = await usersService.updateMe(req.user!.id, req.body);
            res.status(200).json({ status: 'success', data: { user } });
        } catch (error) {
            next(error);
        }
    }

    async updateAvatar(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) return next(new AppError(400, 'Please upload an image'));
            const avatarUrl = (req.file as any).path;
            const user = await usersService.updateMe(req.user!.id, { avatarUrl });
            res.status(200).json({ status: 'success', data: { user } });
        } catch (error) {
            next(error);
        }
    }

    async updateBanner(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) return next(new AppError(400, 'Please upload an image'));
            const bannerUrl = (req.file as any).path;
            const user = await usersService.updateMe(req.user!.id, { bannerUrl });
            res.status(200).json({ status: 'success', data: { user } });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const handle = Array.isArray(req.params.handle) ? req.params.handle[0] : req.params.handle;
            const userId = req.user?.id;
            const user = await usersService.getProfile(handle, userId);
            res.status(200).json({ status: 'success', data: { user } });
        } catch (error) {
            next(error);
        }
    }

    async search(req: Request, res: Response, next: NextFunction) {
        try {
            const query = typeof req.query.q === 'string' ? req.query.q : '';
            const users = await usersService.searchUsers(query);
            res.status(200).json({ status: 'success', data: { users } });
        } catch (error) {
            next(error);
        }
    }
}
