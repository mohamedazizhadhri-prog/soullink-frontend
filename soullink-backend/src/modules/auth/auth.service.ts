import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { hashPassword, comparePasswords } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../../shared/utils/jwt.js';
import { generateOTP } from '../../shared/utils/otp.js';
import { sendSMS } from '../../shared/utils/sms.js';
import { sendVerificationEmail } from '../../shared/utils/email.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../shared/utils/logger.js';

export class AuthService {
    async register(data: any) {
        const { email, phone, password, displayName, handle, dateOfBirth } = data;

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }, { handle }],
            },
        });

        if (existingUser) {
            throw new AppError(400, 'User with this email, phone, or handle already exists');
        }

        // --- FACE DUPLICATION CHECK (New) ---
        if (data.faceDescriptor) {
            const usersWithFace = await prisma.user.findMany({
                where: { faceDescriptor: { not: Prisma.DbNull } }
            });

            for (const user of usersWithFace) {
                const storedDescriptor = user.faceDescriptor as number[];
                if (!storedDescriptor || storedDescriptor.length !== 128) continue;

                const distance = Math.sqrt(
                    data.faceDescriptor.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - storedDescriptor[i], 2), 0)
                );

                if (distance < 0.45) { // Stricter threshold for signup (0.45) to prevent identity theft
                    throw new AppError(400, 'This facial identity is already registered with another account.');
                }
            }
        }
        // ------------------------------------

        const passwordHash = await hashPassword(password);

        const emailOTP = generateOTP();
        const phoneOTP = generateOTP();

        return await prisma.$transaction(async (tx: any) => {
            const createData = {
                email,
                phone,
                passwordHash,
                displayName,
                handle,
                dateOfBirth: new Date(dateOfBirth),
                faceDescriptor: data.faceDescriptor || Prisma.DbNull,
                status: 'PENDING_VERIFICATION',
            };
            console.log('Attempting to create user with data:', JSON.stringify(createData, null, 2));
            const user = await tx.user.create({
                data: createData,
            });

            // Create email verification code
            await tx.verification.create({
                data: {
                    userId: user.id,
                    type: 'EMAIL',
                    code: emailOTP,
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                },
            });

            // Create phone verification code
            await tx.verification.create({
                data: {
                    userId: user.id,
                    type: 'PHONE',
                    code: phoneOTP,
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                },
            });

            // Generate tokens for auto-login
            const accessToken = generateAccessToken(user.id);
            const refreshToken = generateRefreshToken(user.id);

            // Send the actual email (we do this after transaction logically, but we can do it here if we want it to block or outside)
            // To be safe and clean, we'll call it right before returning or use a 'finally' block
            try {
                await sendVerificationEmail(email, emailOTP);
            } catch (err) {
                console.error('Failed to send verification email:', err);
                // We don't necessarily want to fail the whole registration if just the email fails
            }

            return { user, accessToken, refreshToken };
        });
    }

    async login(email: string, password: string) {
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

    async verifyEmail(email: string, code: string) {
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
            throw new AppError(400, 'Invalid verification code');
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
                    status: user.faceDescriptor ? 'ACTIVE' : (user.status === 'PENDING_VERIFICATION' ? 'PENDING_FACE_VERIFY' : user.status)
                },
            }),
        ]);

        return { message: 'Email verified successfully' };
    }

    async verifyPhone(phone: string, code: string) {
        const user = await prisma.user.findUnique({
            where: { phone },
            include: {
                verifications: {
                    where: { type: 'PHONE', code, verified: false },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user || user.verifications.length === 0) {
            throw new AppError(400, 'Invalid phone verification code');
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
                data: { phoneVerified: true },
            }),
        ]);

        return { message: 'Phone verified successfully' };
    }

    async loginWithFace(inputDescriptor: number[]) {
        const users = await prisma.user.findMany({
            where: { faceDescriptor: { not: Prisma.DbNull } }
        });

        if (users.length === 0) throw new AppError(401, 'No user found with face data');

        let bestMatchUser = null;
        let minDistance = 0.6; // Threshold for match (lower is stricter)

        for (const user of users) {
            const storedDescriptor = user.faceDescriptor as number[];
            if (!storedDescriptor || storedDescriptor.length !== 128) continue;

            const distance = Math.sqrt(
                inputDescriptor.reduce((sum: number, val: number, i: number) => sum + Math.pow(val - storedDescriptor[i], 2), 0)
            );

            if (distance < minDistance) {
                minDistance = distance;
                bestMatchUser = user;
            }
        }

        if (!bestMatchUser) {
            throw new AppError(401, 'Face not recognized');
        }

        const user = bestMatchUser;
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        return { user, accessToken, refreshToken };
    }

    async enrollFace(userId: string, imageUrl: string) {
        logger.info(`Enrolling face for user: ${userId}`);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError(404, 'User not found');

        return await prisma.user.update({
            where: { id: userId },
            data: {
                avatarUrl: imageUrl,
                status: 'ACTIVE',
            },
        });
    }
}
