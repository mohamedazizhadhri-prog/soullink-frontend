import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';

import { verifyAccessToken } from './shared/utils/jwt.js';
import { prisma } from './config/database.js';

// ─────────────────────────────────────────────────────────────────────────────
// DB Keep-Alive: Ping every 4 minutes to prevent Neon cold starts
// ─────────────────────────────────────────────────────────────────────────────
setInterval(async () => {
    try { await prisma.$queryRaw`SELECT 1`; } catch (_) { /* silent ping */ }
}, 4 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// Socket Auth Cache: Avoids a DB hit on every socket reconnect
// ─────────────────────────────────────────────────────────────────────────────
interface SocketCacheEntry { id: string; role: string; status: string; }
const socketAuthCache = new Map<string, { user: SocketCacheEntry; expiresAt: number }>();
setInterval(() => {
    const now = Date.now();
    for (const [t, e] of socketAuthCache.entries()) {
        if (now >= e.expiresAt) socketAuthCache.delete(t);
    }
}, 10 * 60 * 1000);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Presence Map: UserId -> SocketId[]
const userSockets = new Map<string, Set<string>>();

// Socket.IO Middleware for Authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        if (!token) {
            logger.warn(`Socket Auth: No token provided by socket ${socket.id}`);
            return next(new Error('Authentication error: No token provided'));
        }

        // ── FAST PATH: cache hit (zero DB queries) ──────────────────────────
        const cached = socketAuthCache.get(token);
        if (cached && Date.now() < cached.expiresAt) {
            (socket as any).user = cached.user;
            return next();
        }

        // ── SLOW PATH: verify JWT then query DB ─────────────────────────────
        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (jwtErr) {
            logger.error(`Socket Auth: JWT verification failed for socket ${socket.id}. Error: ${(jwtErr as Error).message}`);
            return next(new Error('Authentication error: Invalid token'));
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, role: true, status: true }
            });

            if (!user) {
                logger.warn(`Socket Auth: User not found for token. Socket ${socket.id}`);
                return next(new Error('Authentication error: Invalid user'));
            }

            if (user.status === 'BANNED') {
                logger.warn(`Socket Auth: Banned user ${user.id} attempted connection. Socket ${socket.id}`);
                return next(new Error('Authentication error: User is banned'));
            }

            // Cache for 5 minutes to avoid DB hit on frequent reconnects
            socketAuthCache.set(token, { user, expiresAt: Date.now() + 5 * 60 * 1000 });
            (socket as any).user = user;
            next();
        } catch (dbErr: any) {
            logger.error(`Socket Auth: Database error during user lookup. Socket ${socket.id}. Error: ${dbErr.message}`);
            return next(new Error('Internal server error: Unable to verify user (Database connection issues?)'));
        }
    } catch (err) {
        logger.error(`Socket Auth: Unexpected error for socket ${socket.id}: ${(err as Error).message}`);
        next(new Error('Authentication error: An unexpected error occurred'));
    }
});

io.on('connection', async (socket) => {
    const user = (socket as any).user;
    if (!user) return;

    logger.info(`User connected: ${user.id} (${socket.id})`);

    // Track sockets per user for multi-tab support
    if (!userSockets.has(user.id)) {
        userSockets.set(user.id, new Set());
        // First connection: set online
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { onlineStatus: 'ONLINE' }
            });
            io.emit('presence:update', { userId: user.id, status: 'ONLINE' });
        } catch (err) {
            logger.error(`Presence Online Error for ${user.id}: ${(err as Error).message}`);
        }
    }
    userSockets.get(user.id)!.add(socket.id);

    // Join user's personal room for direct notifications
    socket.join(`user:${user.id}`);

    socket.on('disconnect', async () => {
        logger.info(`User disconnected: ${socket.id}`);
        const userSet = userSockets.get(user.id);
        if (userSet) {
            userSet.delete(socket.id);
            if (userSet.size === 0) {
                userSockets.delete(user.id);
                // Last connection closed: set offline
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { onlineStatus: 'OFFLINE' }
                    });
                    io.emit('presence:update', { userId: user.id, status: 'OFFLINE' });
                } catch (err) {
                    logger.error(`Presence Offline Error for ${user.id}: ${(err as Error).message}`);
                }
            }
        }
    });

    // Community Chat Rooms
    socket.on('join:community', ({ communityId }: { communityId: string }) => {
        logger.info(`User ${user.id} joined community room: ${communityId}`);
        socket.join(`community:${communityId}`);
    });

    socket.on('community:leave', (serverId: string) => {
        socket.leave(`community:${serverId}`);
    });

    // Direct Message Events
    socket.on('dm:typing', ({ receiverId, isTyping }: { receiverId: string, isTyping: boolean }) => {
        io.to(`user:${receiverId}`).emit('dm:typing', {
            senderId: user.id,
            isTyping
        });
    });
});

// Reset all user statuses to OFFLINE on server startup
const resetUserPresence = async () => {
    try {
        const result = await prisma.user.updateMany({
            where: { onlineStatus: { not: 'OFFLINE' } },
            data: { onlineStatus: 'OFFLINE' }
        });
        logger.info(`Presence Reset: Set ${result.count} users to OFFLINE on startup`);
    } catch (err) {
        logger.error(`Presence Reset Error: ${(err as Error).message}`);
    }
};

resetUserPresence();

export { server, io };
