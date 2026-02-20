import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { logger } from '../../shared/utils/logger.js';
import { AuthRequest } from '../../middleware/auth.js';

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('Incoming registration request:', req.body);
            const { user, accessToken, refreshToken } = await authService.register(req.body);
            console.log('Registration successful for:', user.email);

            // Set refresh token cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(201).json({
                status: 'success',
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
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
            const { email, password } = req.body;
            const { user, accessToken, refreshToken } = await authService.login(email, password);

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(200).json({
                status: 'success',
                data: {
                    user: { id: user.id, email: user.email, handle: user.handle, role: user.role },
                    accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, code } = req.body;
            const result = await authService.verifyEmail(email, code);
            res.status(200).json({ status: 'success', ...result });
        } catch (error) {
            next(error);
        }
    }

    async verifyPhone(req: Request, res: Response, next: NextFunction) {
        try {
            const { phone, code } = req.body;
            const result = await authService.verifyPhone(phone, code);
            res.status(200).json({ status: 'success', ...result });
        } catch (error) {
            next(error);
        }
    }

    async enrollFace(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) throw new Error('Face image is required');
            const imageUrl = (req.file as any).path; // Cloudinary URL
            const result = await authService.enrollFace(req.user!.id, imageUrl);
            res.status(200).json({ status: 'success', data: { user: result } });
        } catch (error) {
            next(error);
        }
    }

    async logout(req: Request, res: Response) {
        res.clearCookie('refreshToken');
        res.status(200).json({ status: 'success', message: 'Logged out' });
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
                    user: { id: user.id, email: user.email, handle: user.handle, role: user.role },
                    accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}
