import { AuthService } from './auth.service.js';
const authService = new AuthService();
export class AuthController {
    async register(req, res, next) {
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
                        displayName: user.displayName,
                        handle: user.handle,
                        role: user.role,
                        status: user.status
                    },
                    accessToken
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const { user, accessToken, refreshToken } = await authService.login(email, password, ipAddress, userAgent);
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
        }
        catch (error) {
            next(error);
        }
    }
    async verifyEmail(req, res, next) {
        try {
            const { email, code } = req.body;
            const result = await authService.verifyEmail(email, code);
            res.status(200).json({ status: 'success', ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async verifyPhone(req, res, next) {
        try {
            const { phone, code } = req.body;
            const result = await authService.verifyPhone(phone, code);
            res.status(200).json({ status: 'success', ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async enrollFace(req, res, next) {
        try {
            if (!req.file)
                throw new Error('Face image is required');
            const imageUrl = req.file.path;
            const result = await authService.enrollFace(req.user.id, imageUrl);
            res.status(200).json({ status: 'success', data: { user: result } });
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                await authService.logout(token);
            }
            res.clearCookie('refreshToken');
            res.status(200).json({ status: 'success', message: 'Logged out successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    async loginWithFace(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            const result = await authService.forgotPassword(email);
            res.status(200).json({ status: 'success', ...result });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const result = await authService.resetPassword(req.body);
            res.status(200).json({ status: 'success', ...result });
        }
        catch (error) {
            next(error);
        }
    }
}
