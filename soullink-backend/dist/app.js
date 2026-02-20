import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { logger } from './shared/utils/logger.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
const app = express();
// Standard middleware
app.use(helmet());
app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Request logging
app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url}`);
    next();
});
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Root route
app.get('/', (req, res) => {
    res.status(200).send('SoulLink API is running');
});
// Global error handler
app.use(errorHandler);
export { app };
