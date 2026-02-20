import { prisma } from '../../config/database.js';
import { hashPassword, comparePasswords } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../../shared/utils/jwt.js';
import { generateOTP } from '../../shared/utils/otp.js';
import { AppError } from '../../middleware/errorHandler.js';
export class AuthService {
    async register(data) {
        const { email, phone, password, displayName, handle, dateOfBirth } = data;
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }, { handle }],
            },
        });
        if (existingUser) {
            throw new AppError(400, 'User with this email, phone, or handle already exists');
        }
        const passwordHash = await hashPassword(password);
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    phone,
                    passwordHash,
                    displayName,
                    handle,
                    dateOfBirth,
                    status: 'PENDING_VERIFICATION',
                },
            });
            await tx.verification.create({
                data: {
                    userId: user.id,
                    type: 'EMAIL',
                    code: generateOTP(),
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                },
            });
            return user;
        });
    }
    async login(email, password) {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user || !(await comparePasswords(password, user.passwordHash))) {
            throw new AppError(401, 'Invalid email or password');
        }
        if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
            throw new AppError(403, `Account is ${user.status.toLowerCase()}`);
        }
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        await prisma.loginHistory.create({
            data: {
                userId: user.id,
                ipAddress: 'unknown',
                userAgent: 'unknown',
                success: true,
            },
        });
        return { user, accessToken, refreshToken };
    }
    async verifyEmail(email, code) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                verifications: {
                    where: { type: 'EMAIL', code, verified: false },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });
        if (!user || user.verifications.length === 0) {
            throw new AppError(400, 'Invalid oral verification code');
        }
        const verification = user.verifications[0];
        if (verification.expiresAt < new Date()) {
            throw new AppError(400, 'Verification code expired');
        }
        await prisma.$transaction([
            prisma.verification.update({
                where: { id: verification.id },
                data: { verified: true },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    status: user.status === 'PENDING_VERIFICATION' ? 'PENDING_FACE_VERIFY' : user.status
                },
            }),
        ]);
        return { message: 'Email verified successfully' };
    }
}
