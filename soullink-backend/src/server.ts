import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';
import { verifyAccessToken } from './shared/utils/jwt.js';
import { prisma } from './config/database.js';
import { configService } from './modules/admin/config.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// DB Keep-Alive: Ping every 4 minutes to prevent Neon cold starts
// ─────────────────────────────────────────────────────────────────────────────
setInterval(async () => {
    try { await prisma.$queryRaw`SELECT 1`; } catch (_) { /* silent ping */ }
}, 4 * 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// Socket Auth Cache: Avoids a DB hit on every socket reconnect
// ─────────────────────────────────────────────────────────────────────────────
interface SocketCacheEntry { id: string; role: string; status: string; displayName?: string; avatarUrl?: string; }
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

// ── In-Memory Watch Party Session Store ──────────────────────────────────────
interface WatchSession {
    id:        string;
    hostId:    string;
    context:   'dm' | 'community' | 'match';
    contextId: string;
    videoId:   string | null;
    videoTitle:string | null;
    isPlaying: boolean;
    timestamp: number;    // seconds
    lastUpdate:number;    // Date.now()
    members:   Set<string>; // userIds
}
const watchSessions = new Map<string, WatchSession>();
const watchSessionIntervals = new Map<string, NodeJS.Timeout>();

// Heartbeat: broadcast state to all active sessions every 30s
setInterval(() => {
    for (const [sessionId, session] of watchSessions.entries()) {
        if (session.members.size === 0) {
            // Clean up empty sessions and their intervals
            const interval = watchSessionIntervals.get(sessionId);
            if (interval) { clearInterval(interval); watchSessionIntervals.delete(sessionId); }
            watchSessions.delete(sessionId);
            continue;
        }
        const currentTs = session.isPlaying
            ? session.timestamp + (Date.now() - session.lastUpdate) / 1000
            : session.timestamp;
        io.to(`watch:${sessionId}`).emit('watch:heartbeat', {
            timestamp: currentTs,
            isPlaying: session.isPlaying,
        });
    }
}, 30_000);

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
                select: { id: true, role: true, status: true, displayName: true, avatarUrl: true }
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

    // ─────────────────────────────────────────────────────────────────────
    //  WebRTC Signaling — 1:1 Calls (DM + Match)
    // ─────────────────────────────────────────────────────────────────────

    // Track active call start times for CallLog duration calculation
    const callStartTimes = new Map<string, Date>();

    socket.on('call:initiate', async ({ targetUserId, callType, context, contextId }: {
        targetUserId: string; callType: 'audio' | 'video'; context: 'dm' | 'match'; contextId?: string;
    }) => {
        logger.info(`[Call] ${user.id} initiating ${callType} call to ${targetUserId}`);
        const caller = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, displayName: true, avatarUrl: true, handle: true }
        });
        io.to(`user:${targetUserId}`).emit('call:incoming', {
            callerId: user.id,
            caller,
            callType,
            context,
            contextId,
        });
    });

    socket.on('call:accept', ({ callerId, callType }: { callerId: string; callType: 'audio' | 'video' }) => {
        logger.info(`[Call] ${user.id} accepted call from ${callerId}`);
        const callKey = [callerId, user.id].sort().join(':');
        callStartTimes.set(callKey, new Date());
        io.to(`user:${callerId}`).emit('call:accepted', { accepterId: user.id, callType });
    });

    socket.on('call:reject', async ({ callerId, context, contextId }: { 
        callerId: string; 
        context?: 'dm' | 'match'; 
        contextId?: string; 
    }) => {
        logger.info(`[Call] ${user.id} rejected call from ${callerId}`);
        io.to(`user:${callerId}`).emit('call:rejected', { rejecterId: user.id });

        // Create a CALL message for rejected calls
        try {
            const callContent = JSON.stringify({
                callType: 'audio',
                duration: 0,
                initiatedBy: callerId,
                status: 'rejected'
            });

            if (!context || context === 'dm') {
                const dmMsg = await prisma.directMessage.create({
                    data: {
                        senderId: callerId,
                        receiverId: user.id,
                        type: 'CALL',
                        content: callContent,
                        read: true,
                    },
                    include: {
                        sender: { select: { id: true, displayName: true, avatarUrl: true, handle: true } },
                    },
                });
                io.to(`user:${callerId}`).emit('dm:new', dmMsg);
                io.to(`user:${user.id}`).emit('dm:new', dmMsg);
            } else if (context === 'match' && contextId) {
                const matchMsg = await prisma.matchMessage.create({
                    data: {
                        conversationId: contextId,
                        senderId: callerId,
                        type: 'CALL',
                        content: callContent,
                    },
                });
                io.to(`match:${contextId}`).emit('match:message', matchMsg);
            }
        } catch (err) {
            logger.error(`[Call] Failed to create CALL message for rejection: ${(err as Error).message}`);
        }
    });

    socket.on('call:offer', ({ targetUserId, offer }: { targetUserId: string; offer: RTCSessionDescriptionInit }) => {
        io.to(`user:${targetUserId}`).emit('call:offer', { callerId: user.id, offer });
    });

    socket.on('call:answer', ({ targetUserId, answer }: { targetUserId: string; answer: RTCSessionDescriptionInit }) => {
        io.to(`user:${targetUserId}`).emit('call:answer', { answererId: user.id, answer });
    });

    socket.on('call:ice-candidate', ({ targetUserId, candidate }: { targetUserId: string; candidate: RTCIceCandidateInit }) => {
        io.to(`user:${targetUserId}`).emit('call:ice-candidate', { senderId: user.id, candidate });
    });

    socket.on('call:end', async ({ targetUserId, callType, context, contextId }: {
        targetUserId: string;
        callType: string;
        context?: 'dm' | 'match';
        contextId?: string;
    }) => {
        logger.info(`[Call] ${user.id} ended call with ${targetUserId}`);
        io.to(`user:${targetUserId}`).emit('call:ended', { endedBy: user.id });

        // Persist CallLog
        const callKey = [user.id, targetUserId].sort().join(':');
        const startedAt = callStartTimes.get(callKey);
        callStartTimes.delete(callKey);
        const duration = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 1000) : 0;
        try {
            await prisma.callLog.create({
                data: {
                    callerId: user.id,
                    receiverId: targetUserId,
                    type: callType || 'audio',
                    startedAt: startedAt || new Date(),
                    endedAt: new Date(),
                    duration,
                },
            });
        } catch (err) {
            logger.error(`[Call] Failed to save CallLog: ${(err as Error).message}`);
        }

        // Create a CALL message in the DM or Match conversation
        try {
            const callContent = JSON.stringify({
                callType: callType || 'audio',
                duration,
                initiatedBy: user.id,
            });

            if (!context || context === 'dm') {
                const dmMsg = await prisma.directMessage.create({
                    data: {
                        senderId: user.id,
                        receiverId: targetUserId,
                        type: 'CALL',
                        content: callContent,
                        read: false,
                    },
                    include: {
                        sender: { select: { id: true, displayName: true, avatarUrl: true, handle: true } },
                    },
                });
                io.to(`user:${user.id}`).emit('dm:new', dmMsg);
                io.to(`user:${targetUserId}`).emit('dm:new', dmMsg);
            } else if (context === 'match' && contextId) {
                const matchMsg = await prisma.matchMessage.create({
                    data: {
                        conversationId: contextId,
                        senderId: user.id,
                        type: 'CALL',
                        content: callContent,
                    },
                });
                io.to(`match:${contextId}`).emit('match:message', matchMsg);
            }
            logger.info(`[Call] Created CALL message for ${user.id} ↔ ${targetUserId} in ${context || 'dm'}`);
        } catch (err) {
            logger.error(`[Call] Failed to create CALL message: ${(err as Error).message}`);
        }
    });

    // ─────────────────────────────────────────────────────────────────────
    //  WebRTC Signaling — Multi-Party Voice Channels (Community)
    // ─────────────────────────────────────────────────────────────────────

    socket.on('voice:join', async ({ channelId, communityId }: { channelId: string; communityId?: string }) => {
        const room = `voice:${channelId}`;
        socket.join(room);

        // Collect existing members in the room (excluding self)
        const roomSockets = await io.in(room).fetchSockets();
        const existingMembers = roomSockets
            .filter(s => s.id !== socket.id)
            .map(s => ({ socketId: s.id, userId: (s as any).user?.id, displayName: (s as any).user?.displayName }));

        // Tell the joiner who's already in the room
        socket.emit('voice:members', { channelId, members: existingMembers });

        // Tell everyone else in the voice room that a new user joined for WebRTC purposes
        socket.to(room).emit('voice:user-joined', {
            channelId,
            socketId: socket.id,
            userId: user.id,
        });

        // Broadcast to entire community for sidebar presence/counts
        if (communityId) {
            io.to(`community:${communityId}`).emit('voice:presence-update', {
                channelId,
                userId: user.id,
                displayName: user.displayName,
                action: 'join'
            });
        }

        logger.info(`[Voice] ${user.id} joined voice channel ${channelId} (${existingMembers.length} existing)`);
    });

    socket.on('voice:leave', ({ channelId, communityId }: { channelId: string; communityId?: string }) => {
        const room = `voice:${channelId}`;
        socket.leave(room);
        socket.to(room).emit('voice:user-left', {
            channelId,
            socketId: socket.id,
            userId: user.id,
        });

        // Broadcast to entire community for sidebar presence/counts
        if (communityId) {
            io.to(`community:${communityId}`).emit('voice:presence-update', {
                channelId,
                userId: user.id,
                action: 'leave'
            });
        }
        logger.info(`[Voice] ${user.id} left voice channel ${channelId}`);
    });

    // Mesh signaling: relay offers/answers/ice between specific peers in a voice room
    socket.on('voice:offer', ({ targetSocketId, offer }: { targetSocketId: string; offer: RTCSessionDescriptionInit }) => {
        io.to(targetSocketId).emit('voice:offer', { senderSocketId: socket.id, senderId: user.id, offer });
    });

    socket.on('voice:answer', ({ targetSocketId, answer }: { targetSocketId: string; answer: RTCSessionDescriptionInit }) => {
        io.to(targetSocketId).emit('voice:answer', { senderSocketId: socket.id, senderId: user.id, answer });
    });

    socket.on('voice:ice-candidate', ({ targetSocketId, candidate }: { targetSocketId: string; candidate: RTCIceCandidateInit }) => {
        io.to(targetSocketId).emit('voice:ice-candidate', { senderSocketId: socket.id, senderId: user.id, candidate });
    });

    // ─────────────────────────────────────────────────────────────────────
    //  Watch Party — Shared YouTube Activities
    // ─────────────────────────────────────────────────────────────────────

    socket.on('watch:create', async ({ context, contextId, videoId }: {
        context: 'dm' | 'community' | 'match';
        contextId: string;
        videoId?: string;
    }) => {
        let roomId = contextId;
        if (context === 'dm' || context === 'match') {
            roomId = [user.id, contextId].sort().join(':');
        }

        // Anchor: Use the roomId as a lookup to find or create a stable sessionId
        let sessionId: string | undefined;
        for (const [id, s] of watchSessions.entries()) {
            if (s.context === context && s.contextId === roomId) {
                sessionId = id;
                break;
            }
        }

        if (sessionId) {
            const s = watchSessions.get(sessionId)!;
            socket.join(`watch:${sessionId}`);
            s.members.add(user.id);
            socket.emit('watch:session-created', { sessionId, hostId: s.hostId });
            
            const currentTs = s.isPlaying ? s.timestamp + (Date.now() - s.lastUpdate) / 1000 : s.timestamp;
            socket.emit('watch:state-sync', {
                isPlaying: s.isPlaying, timestamp: currentTs,
                videoId: s.videoId, videoTitle: s.videoTitle, hostId: s.hostId
            });
            return;
        }

        sessionId = `wp_${roomId.replace(/[:]/g, '_')}`; // Stable ID based on room
        watchSessions.set(sessionId, {
            id: sessionId, hostId: user.id, context, contextId: roomId,
            videoId: videoId ?? null, videoTitle: null,
            isPlaying: false, timestamp: 0,
            lastUpdate: Date.now(), members: new Set([user.id]),
        });
        socket.join(`watch:${sessionId}`);
        socket.emit('watch:session-created', { sessionId, hostId: user.id });


        // Heartbeat interval to keep everyone in sync
        const interval = setInterval(() => {
            const session = watchSessions.get(sessionId);
            if (!session) {
                clearInterval(interval);
                watchSessionIntervals.delete(sessionId);
                return;
            }
            if (session.isPlaying) {
                const currentTs = session.timestamp + (Date.now() - session.lastUpdate) / 1000;
                io.to(`watch:${sessionId}`).emit('watch:heartbeat', {
                    isPlaying: true,
                    timestamp: currentTs
                });
            }
        }, 3000);
        watchSessionIntervals.set(sessionId, interval);

        // Notify participants via their personal user rooms
        try {
            if (context === 'dm') {
                io.to(`user:${contextId}`).emit('watch:activity-started', {
                    sessionId, hostId: user.id, hostName: user.displayName,
                });
            } else if (context === 'match') {
                const match = await prisma.match.findUnique({
                    where: { id: contextId },
                    select: { senderId: true, receiverId: true }
                });
                if (match) {
                    const partnerId = match.senderId === user.id ? match.receiverId : match.senderId;
                    io.to(`user:${partnerId}`).emit('watch:activity-started', {
                        sessionId, hostId: user.id, hostName: user.displayName,
                    });
                }
            }
        } catch (err) {
            logger.error(`[WatchParty] Failed to notify partner: ${(err as Error).message}`);
        }
        logger.info(`[WatchParty] ${user.id} created session ${sessionId} in ${context}:${contextId}`);
    });

    socket.on('watch:get-active', ({ context, contextId }: { context: string; contextId: string }) => {
        let roomId = contextId;
        if (context === 'dm' || context === 'match') {
            roomId = [user.id, contextId].sort().join(':');
        }

        for (const [id, s] of watchSessions.entries()) {
            if (s.context === context && s.contextId === roomId) {
                socket.emit('watch:activity-started', {
                    sessionId: id,
                    hostId: s.hostId,
                    hostName: 'Someone',
                    videoId: s.videoId,
                    videoTitle: s.videoTitle
                });
                return;
            }
        }
    });

    socket.on('watch:invite', async ({ sessionId, targetUserIds }: {
        sessionId: string; targetUserIds: string[];
    }) => {
        const session = watchSessions.get(sessionId);
        if (!session || session.hostId !== user.id) return;
        const host = await prisma.user.findUnique({
            where: { id: user.id },
            select: { displayName: true, avatarUrl: true }
        });
        for (const targetId of targetUserIds) {
            io.to(`user:${targetId}`).emit('watch:invited', {
                sessionId, hostId: user.id,
                hostName: host?.displayName ?? 'Someone',
                hostAvatar: host?.avatarUrl ?? null,
                videoId: session.videoId,
                videoTitle: session.videoTitle,
            });
        }
    });

    socket.on('watch:join', async ({ sessionId }: { sessionId: string }) => {
        const session = watchSessions.get(sessionId);
        if (!session) return;

        socket.join(`watch:${sessionId}`);
        session.members.add(user.id);

        const currentTs = session.isPlaying 
            ? session.timestamp + (Date.now() - session.lastUpdate) / 1000 
            : session.timestamp;

        // Send full session state including video to the joiner immediately
        socket.emit('watch:state-sync', {
            isPlaying: session.isPlaying,
            timestamp: currentTs,
            videoId: session.videoId,
            videoTitle: session.videoTitle,
            hostId: session.hostId
        });

        // Also send video-changed so the joiner's player loads the video
        if (session.videoId) {
            socket.emit('watch:video-changed', {
                videoId: session.videoId,
                title: session.videoTitle,
                thumbnail: null
            });
        }

        // Fetch full user info for the member-joined notification
        let joinerInfo = { displayName: user.displayName || 'Someone', avatarUrl: user.avatarUrl || null };
        try {
            const fullUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { displayName: true, avatarUrl: true }
            });
            if (fullUser) joinerInfo = { displayName: fullUser.displayName, avatarUrl: fullUser.avatarUrl };
        } catch (_) {}

        // Notify all other members (especially the host) that someone joined
        socket.to(`watch:${sessionId}`).emit('watch:member-joined', {
            userId: user.id, displayName: joinerInfo.displayName, avatarUrl: joinerInfo.avatarUrl
        });
        logger.info(`[WatchParty] ${user.id} (${joinerInfo.displayName}) joined session ${sessionId}`);
    });

    socket.on('watch:leave', ({ sessionId }: { sessionId: string }) => {
        const session = watchSessions.get(sessionId);
        if (!session) return;
        session.members.delete(user.id);
        socket.leave(`watch:${sessionId}`);
        if (session.hostId === user.id) {
            io.to(`watch:${sessionId}`).emit('watch:ended', { reason: 'host-left' });
            // Clean up per-session heartbeat interval
            const interval = watchSessionIntervals.get(sessionId);
            if (interval) { clearInterval(interval); watchSessionIntervals.delete(sessionId); }
            watchSessions.delete(sessionId);
        } else {
            socket.to(`watch:${sessionId}`).emit('watch:member-left', { userId: user.id });
        }
    });

    socket.on('watch:play', ({ sessionId, timestamp }: { sessionId: string; timestamp: number }) => {
        const session = watchSessions.get(sessionId);
        if (!session || !session.members.has(user.id)) return;
        // Only the host can control playback
        if (session.hostId !== user.id) return;
        session.isPlaying = true; session.timestamp = timestamp; session.lastUpdate = Date.now();
        socket.to(`watch:${sessionId}`).emit('watch:play', { timestamp });
    });

    socket.on('watch:pause', ({ sessionId, timestamp }: { sessionId: string; timestamp: number }) => {
        const session = watchSessions.get(sessionId);
        if (!session || !session.members.has(user.id)) return;
        // Only the host can control playback
        if (session.hostId !== user.id) return;
        session.isPlaying = false; session.timestamp = timestamp;
        socket.to(`watch:${sessionId}`).emit('watch:pause', { timestamp });
    });

    socket.on('watch:seek', ({ sessionId, timestamp }: { sessionId: string; timestamp: number }) => {
        const session = watchSessions.get(sessionId);
        if (!session || !session.members.has(user.id)) return;
        // Only the host can control playback
        if (session.hostId !== user.id) return;
        session.timestamp = timestamp; session.lastUpdate = Date.now();
        socket.to(`watch:${sessionId}`).emit('watch:seek', { timestamp });
    });

    socket.on('watch:change-video', ({ sessionId, videoId, title, thumbnail }: {
        sessionId: string; videoId: string; title: string; thumbnail: string;
    }) => {
        const session = watchSessions.get(sessionId);
        if (!session || !session.members.has(user.id)) return;
        // Only the host can change the video
        if (session.hostId !== user.id) return;
        session.videoId = videoId; session.videoTitle = title;
        session.isPlaying = true; session.timestamp = 0; session.lastUpdate = Date.now();
        io.to(`watch:${sessionId}`).emit('watch:video-changed', { videoId, title, thumbnail });
        logger.info(`[WatchParty] Video changed to ${videoId} in session ${sessionId} by ${user.id}`);
    });

    socket.on('watch:reaction', ({ sessionId, emoji }: { sessionId: string; emoji: string }) => {
        io.to(`watch:${sessionId}`).emit('watch:reaction', {
            userId: user.id, displayName: user.displayName, emoji
        });
    });

    // Relay cursor positions to all other session members
    socket.on('watch:cursor', ({ sessionId, x, y }: { sessionId: string; x: number; y: number }) => {
        socket.to(`watch:${sessionId}`).emit('watch:cursor', {
            userId: user.id,
            displayName: user.displayName,
            x, y
        });
    });

    socket.on('watch:request-sync', ({ sessionId }: { sessionId: string }) => {
        const session = watchSessions.get(sessionId);
        if (!session) return;
        const currentTs = session.isPlaying
            ? session.timestamp + (Date.now() - session.lastUpdate) / 1000
            : session.timestamp;
        socket.emit('watch:state-sync', {
            isPlaying: session.isPlaying, timestamp: currentTs,
            videoId: session.videoId, videoTitle: session.videoTitle,
            hostId: session.hostId
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

// Seed system config defaults on every startup (skips existing rows)
configService.seed().catch((err: any) => logger.error('[Config] Seed failed:', err));

export { server, io };
