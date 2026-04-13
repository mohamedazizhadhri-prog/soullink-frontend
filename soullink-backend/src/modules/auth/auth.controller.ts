import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { logger } from '../../shared/utils/logger.js';
import { AuthRequest } from '../../middleware/auth.js';

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, accessToken, refreshToken } = await authService.register(req.body);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.status(201).json({
                status: 'success',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        phone: user.phone,
                        displayName: user.displayName,
                        handle: user.handle,
                        role: user.role,
                        status: user.status
                    },
                    accessToken
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { identifier, password, timezone } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';

            const { user, accessToken, refreshToken } = await authService.login(identifier, password, ipAddress, userAgent, timezone);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    user: { id: user.id, email: user.email, phone: user.phone, handle: user.handle, role: user.role },
                    accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { identifier, code } = req.body;
            const result = await authService.verifyEmail(identifier, code);
            res.status(200).json({ status: 'success', ...result });
        } catch (error) {
            next(error);
        }
    }

    async verifyPhone(req: Request, res: Response, next: NextFunction) {
        try {
            const { identifier, code } = req.body;
            const result = await authService.verifyPhone(identifier, code);
            res.status(200).json({ status: 'success', ...result });
        } catch (error) {
            next(error);
        }
    }

    async enrollFace(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) throw new Error('Face image is required');
            const imageUrl = (req.file as any).path;
            const result = await authService.enrollFace(req.user!.id, imageUrl);
            res.status(200).json({ status: 'success', data: { user: result } });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                await authService.logout(token);
            }
            res.clearCookie('refreshToken');
            res.status(200).json({ status: 'success', message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    async loginWithFace(req: Request, res: Response, next: NextFunction) {
        try {
            const { descriptor } = req.body;
            const { user, accessToken, refreshToken } = await authService.loginWithFace(descriptor);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    user: { id: user.id, email: user.email, phone: user.phone, handle: user.handle, role: user.role },
                    accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { identifier } = req.body;
            const result = await authService.forgotPassword(identifier);
            res.status(200).json({ status: 'success', ...result });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.resetPassword(req.body);
            res.status(200).json({ status: 'success', ...result });
        } catch (error) {
            next(error);
        }
    }
}
