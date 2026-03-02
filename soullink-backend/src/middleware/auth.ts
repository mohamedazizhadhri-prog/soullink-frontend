import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/utils/jwt.js';
import { AppError } from './errorHandler.js';
import { prisma } from '../config/database.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        displayName?: string;
        avatarUrl?: string | null;
    };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token;
        console.log('Auth Headers:', req.headers.authorization ? 'Present' : 'Missing');
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            console.warn('No token found in request headers');
            throw new AppError(401, 'You are not logged in. Please log in to get access.');
        }

        const decoded = verifyAccessToken(token);

        // Check if token is blacklisted
        const isBlacklisted = await (prisma as any).tokenBlacklist.findUnique({
            where: { token }
        });


        if (isBlacklisted) {
            throw new AppError(401, 'Token is no longer valid. Please log in again.');
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true, status: true, displayName: true, avatarUrl: true },
        });

        if (!user) {
            throw new AppError(401, 'The user belonging to this token no longer exists.');
        }

        if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
            throw new AppError(403, `Your account is ${user.status.toLowerCase()}`);
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

export const restrictTo = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(403, 'You do not have permission to perform this action.'));
        }
        next();
    };
};
