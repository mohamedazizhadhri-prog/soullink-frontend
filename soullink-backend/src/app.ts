import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { logger } from './shared/utils/logger.js';
import { corsOptions } from './config/cors.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import aiRoutes from './modules/ai-companion/ai.routes.js';
import soulGamesRoutes from './modules/soulgames/soulgames.routes.js';
import friendsRoutes from './modules/friends/friends.routes.js';
import communityRoutes from './modules/community/community.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import matchingRoutes from './modules/matching/matching.routes.js';
import personalityRoutes from './modules/personality/personality.routes.js';
// Step 2: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §3
import adminRoutes from './modules/admin/admin.routes.js';
// Step 3: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §4
import moderationRoutes from './modules/moderation/moderation.routes.js';
// Step 4: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §5
import analyticsRoutes from './modules/analytics/analytics.routes.js';
// User-facing report submission
import reportsRoutes from './modules/reports/reports.routes.js';
import feedbackRoutes from './modules/feedback/feedback.routes.js';

import { server, io } from './server.js';

const app = express();

// Attach Socket.IO to requests
app.use((req: any, res, next) => {
    req.io = io;
    next();
});

// Standard middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiRateLimiter);

// Request logging
app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/soulgames', soulGamesRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/personality', personalityRoutes);
// Admin god-mode routes — ADMIN role only (§3 of walkthrough plan)
app.use('/api/admin', adminRoutes);
// Moderation scoped routes — ADMIN + MODERATOR (§4 of walkthrough plan)
app.use('/api/moderation', moderationRoutes);
// Analytics dashboard routes — ADMIN role only (§5 of walkthrough plan)
app.use('/api/analytics', analyticsRoutes);
// User-facing report submission — any authenticated user
app.use('/api/reports', reportsRoutes);
app.use('/api/feedback', feedbackRoutes);

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
