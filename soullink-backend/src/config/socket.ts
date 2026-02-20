import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from './env.js';
import { logger } from '../shared/utils/logger.js';

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: env.FRONTEND_URL,
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
