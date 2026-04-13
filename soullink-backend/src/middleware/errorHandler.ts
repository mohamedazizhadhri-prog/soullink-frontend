import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/utils/logger.js';

export class AppError extends Error {
    constructor(public statusCode: number, public message: string) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    let statusCode = err instanceof AppError ? err.statusCode : 500;
    let message = err.message || 'Internal server error';

    // Handle JWT specific errors
    if (err && err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    } else if (err && err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your token has expired. Please log in again.';
    } else if (err && (err as any).code === 'P1001') {
        statusCode = 503;
        message = 'Database connection refused. Please check if the database server is running or your connection string is correct.';
    } else if (err && (err as any).code === 'P2024') {
        statusCode = 503;
        message = 'Database connection timeout. The server taking too long to respond.';
    }

    if (statusCode === 500) {
        // Safer logging of potentially weird error objects
        const errorDetail = err instanceof Error ? (err.stack || err.message) : JSON.stringify(err);
        logger.error(`[Unhandled Error] Status: ${statusCode} - Detail: ${errorDetail}`);
    }

    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
