import rateLimit from 'express-rate-limit';
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for auth routes
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
});
