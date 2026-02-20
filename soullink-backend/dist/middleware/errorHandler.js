import { logger } from '../shared/utils/logger';
export class AppError extends Error {
    statusCode;
    message;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export const errorHandler = (err, req, res, next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';
    if (statusCode === 500) {
        logger.error(`[Unhandled Error] ${err.stack}`);
    }
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
