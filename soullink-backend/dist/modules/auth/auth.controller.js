import { AuthService } from './auth.service.js';
const authService = new AuthService();
export class AuthController {
    async register(req, res, next) {
        try {
            const user = await authService.register(req.body);
            res.status(201).json({
                status: 'success',
                message: 'Account created. Please verify your email.',
                data: { user: { id: user.id, email: user.email, handle: user.handle } },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    async verifyEmail(req, res, next) {
        try {
            const { email, code } = req.body;
            const result = await authService.verifyEmail(email, code);
            res.status(200).json({
                status: 'success',
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res) {
        res.clearCookie('refreshToken');
        res.status(200).json({ status: 'success', message: 'Logged out' });
    }
}
