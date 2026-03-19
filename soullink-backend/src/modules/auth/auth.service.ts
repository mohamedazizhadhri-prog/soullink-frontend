import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { hashPassword, comparePasswords } from '../../shared/utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../../shared/utils/jwt.js';
import { generateOTP } from '../../shared/utils/otp.js';
import { sendSMS } from '../../shared/utils/sms.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../shared/utils/email.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../shared/utils/logger.js';

export class AuthService {
    async register(data: any) {
        const { email, phone, password, displayName, handle, dateOfBirth, city, country, timezone } = data;

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(email ? [{ email }] : []),
                    ...(phone ? [{ phone }] : []),
                    { handle }
                ],
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

        const emailOTP = email ? generateOTP() : null;
        const phoneOTP = phone ? generateOTP() : null;

        const result = await prisma.$transaction(async (tx: any) => {
            const createData = {
                email: email || null,
                phone: phone || null,
                passwordHash,
                displayName,
                handle,
                dateOfBirth: new Date(dateOfBirth),
                city,
                country,
                timezone: timezone || 'UTC', // Ensure timezone defaults to 'UTC' if not provided
                faceDescriptor: data.faceDescriptor || Prisma.DbNull,
                status: 'PENDING_VERIFICATION',
            };
            console.log('Attempting to create user with data:', JSON.stringify(createData, null, 2));
            const user = await tx.user.create({
                data: createData,
            });

            // Create verification codes based on what was provided
            if (email && emailOTP) {
                await tx.verification.create({
                    data: {
                        userId: user.id,
                        type: 'EMAIL',
                        code: emailOTP,
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                    },
                });
            }

            if (phone && phoneOTP) {
                await tx.verification.create({
                    data: {
                        userId: user.id,
                        type: 'PHONE',
                        code: phoneOTP,
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                    },
                });
            }

            // Generate tokens for auto-login
            const accessToken = generateAccessToken(user.id);
            const refreshToken = generateRefreshToken(user.id);

            return { user, accessToken, refreshToken };
        }, {
            timeout: 10000, // Increase to 10s for slow environments
        });

        // 6. Send verification codes (OUTSIDE the database transaction)
        // This is where it was failing before because it waited for the email/SMS API.
        try {
            if (email && emailOTP) await sendVerificationEmail(email as string, emailOTP);
            if (phone && phoneOTP) await sendSMS(phone as string, `Your SoulLink verification code is: ${phoneOTP}`);
        } catch (err) {
            console.error('Failed to send verification email or SMS:', err);
            // We don't throw here because the user is already created in the DB successfully.
        }

        return result;
    }

    async login(identifier: string, password: string, ipAddress: string = 'unknown', userAgent: string = 'unknown', timezone: string = 'UTC') {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { phone: identifier }],
            },
        });

        if (!user || !(await comparePasswords(password, user.passwordHash))) {
            throw new AppError(401, 'Invalid email/phone or password');
        }

        if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
            throw new AppError(403, `Account is ${user.status.toLowerCase()}`);
        }

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        await prisma.$transaction([
            prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    ipAddress,
                    userAgent,
                    success: true,
                },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    timezone: timezone
                }
            })
        ]);

        return { user, accessToken, refreshToken };
    }

    async verifyEmail(identifier: string, code: string) {
        const user = await prisma.user.findUnique({
            where: { email: identifier },
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

    async verifyPhone(identifier: string, code: string) {
        const user = await prisma.user.findUnique({
            where: { phone: identifier },
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

        // Update face record and login time
        await prisma.user.update({
            where: { id: user.id },
            data: {
                faceVerified: true,
                lastLoginAt: new Date()
            }
        });

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
                faceVerified: true,
            },
        });
    }

    async forgotPassword(identifier: string) {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { phone: identifier }],
            },
        });
        if (!user) {
            // To prevent user enumeration, we don't throw error if user not found, 
            // but we won't send anything. 
            return { message: 'If an account exists, a reset code has been sent.' };
        }

        const otp = generateOTP();

        await prisma.verification.create({
            data: {
                userId: user.id,
                type: 'PASSWORD_RESET' as any,
                code: otp,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
            },
        });

        if (user.email && identifier === user.email) {
            await sendVerificationEmail(user.email, otp); // Reusing verification email for now or specialized reset
        } else if (user.phone && identifier === user.phone) {
            await sendSMS(user.phone, `Your SoulLink password reset code: ${otp}`);
        }
        logger.info(`[DEBUG] Password reset OTP for ${identifier}: ${otp}`);

        return { message: 'If an account exists, a reset code has been sent.' };
    }

    async resetPassword(data: any) {
        const { identifier, code, newPassword } = data;

        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email: identifier }, { phone: identifier }],
            },
            include: {
                verifications: {
                    where: { type: 'PASSWORD_RESET' as any, code, verified: false },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            } as any,
        });

        if (!user || !(user as any).verifications || (user as any).verifications.length === 0) {
            throw new AppError(400, 'Invalid or expired reset code');
        }

        const verification = (user as any).verifications[0];
        if (verification.expiresAt < new Date()) {
            throw new AppError(400, 'Reset code expired');
        }

        const passwordHash = await hashPassword(newPassword);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash },
            }),
            prisma.verification.update({
                where: { id: verification.id },
                data: { verified: true },
            }),
        ]);

        return { message: 'Password reset successfully' };
    }

    async logout(token: string) {
        // Decode token to find expiry
        // For now, we'll blacklist it for 24 hours as a safe default
        // In a more advanced version, we'd extract the 'exp' claim
        await (prisma as any).tokenBlacklist.create({
            data: {
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
    }
}

