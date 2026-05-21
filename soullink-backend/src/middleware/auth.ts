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

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Auth Cache
// Stores validated tokens in RAM so repeated requests skip DB entirely.
// Structure: token -> { user, expiresAt (timestamp) }
// ─────────────────────────────────────────────────────────────────────────────
interface CacheEntry {
    user: {
        id: string;
        role: string;
        status: string;
        displayName: string;
        avatarUrl: string | null;
    };
    expiresAt: number; // Unix ms timestamp
}

const authCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // Cache valid tokens for 5 minutes

// Prevent memory leaks: sweep expired entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of authCache.entries()) {
        if (now >= entry.expiresAt) {
            authCache.delete(token);
        }
    }
}, 10 * 60 * 1000);

/**
 * Exported so that the logout handler can immediately evict a token
 * from the cache, making it invalid without waiting for TTL expiry.
 */
export function invalidateAuthCache(token: string): void {
    authCache.delete(token);
}

// ─────────────────────────────────────────────────────────────────────────────
// Protect Middleware
// ─────────────────────────────────────────────────────────────────────────────
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError(401, 'You are not logged in. Please log in to get access.');
        }

        // Helper to enforce status constraints while allowing access to appeal endpoints
        const enforceStatus = (userStatus: string) => {
            if (userStatus === 'BANNED' || userStatus === 'SUSPENDED') {
                const allowedPaths = ['/api/users/me/suspension', '/api/moderation/appeals'];
                const isAllowed = allowedPaths.some(p => req.originalUrl.includes(p));
                if (!isAllowed) {
                    throw new AppError(403, `Your account is ${userStatus.toLowerCase()}.`);
                }
            }
        };

        // ── FAST PATH: cache hit (zero DB queries) ──────────────────────────
        const cached = authCache.get(token);
        if (cached && Date.now() < cached.expiresAt) {
            enforceStatus(cached.user.status);
            req.user = cached.user;
            return next();
        }

        // ── SLOW PATH: cache miss — verify JWT then query DB ─────────────────
        const decoded = verifyAccessToken(token); // throws if invalid / expired

        // Run BOTH DB queries in parallel instead of sequentially
        const [isBlacklisted, user] = await Promise.all([
            (prisma as any).tokenBlacklist.findUnique({ where: { token } }),
            prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, role: true, status: true, displayName: true, avatarUrl: true },
            }),
        ]);

        if (isBlacklisted) {
            throw new AppError(401, 'Token is no longer valid. Please log in again.');
        }

        if (!user) {
            throw new AppError(401, 'The user belonging to this token no longer exists.');
        }

        enforceStatus(user.status);

        // Store in cache — subsequent requests skip all of the above
        authCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });

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
