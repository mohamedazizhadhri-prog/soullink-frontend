import { ZodError } from 'zod';
import { logger } from '../shared/utils/logger.js';
export const validate = (schema) => async (req, res, next) => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        return next();
    }
    catch (error) {
        if (error instanceof ZodError) {
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
