import { AppError } from './errorHandler.js';
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        // @ts-ignore - user added by auth middleware
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(403, 'You do not have permission to perform this action'));
        }
        next();
    };
};
