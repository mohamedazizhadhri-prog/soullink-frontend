import { verifyAccessToken } from '../shared/utils/jwt.js';
import { AppError } from './errorHandler.js';
import { prisma } from '../config/database.js';
export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            throw new AppError(401, 'You are not logged in. Please log in to get access.');
        }
        const decoded = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true, status: true },
        });
        if (!user) {
            throw new AppError(401, 'The user belonging to this token no longer exists.');
        }
        if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
            throw new AppError(403, `Your account is ${user.status.toLowerCase()}`);
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
};
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(403, 'You do not have permission to perform this action.'));
        }
        next();
    };
};
