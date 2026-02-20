import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);
    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id}`);
    });
});
export { server, io };
