import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { logger } from '../shared/utils/logger.js';

export const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (parsed.body) req.body = parsed.body;
        if (parsed.query) req.query = parsed.query as any;
        if (parsed.params) req.params = parsed.params as any;

        return next();
    } catch (error: any) {
        if (error instanceof ZodError) {
            console.log('Validation failed details:', JSON.stringify(error.issues, null, 2));
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: error.issues.map((err) => ({
                    path: err.path.join('.'),
                    message: err.message,
                })),
            });
        }
        logger.error('Unexpected validation error:', error);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
