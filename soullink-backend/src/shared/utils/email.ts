import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from './logger.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export const sendVerificationEmail = async (email: string, code: string) => {
    try {
        const mailOptions = {
            from: `"SoulLink" <${env.SMTP_USER}>`,
            to: email,
            subject: 'SoulLink - Verify Your Soul',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #9d50bb; margin: 0;">SoulLink</h1>
                    </div>
                    <div style="padding: 20px; border-top: 2px solid #9d50bb;">
                        <h2 style="color: #333333; margin-bottom: 20px;">Welcome to the SoulLink Connection!</h2>
                        <p style="font-size: 16px; color: #555555; line-height: 1.5;">
                            To complete your registration and begin your authentic journey, please use the following verification code:
                        </p>
                        <div style="text-align: center; padding: 30px; background-color: #f9f9f9; border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 36px; font-weight: 800; color: #9d50bb; letter-spacing: 5px;">${code}</span>
                        </div>
                        <p style="font-size: 14px; color: #888888; text-align: center;">
                            This code will expire in 15 minutes.
                        </p>
                    </div>
                    <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #aaaaaa;">
                        <p>&copy; 2026 SoulLink. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Verification email sent to ${email}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`Error sending verification email to ${email}:`, error);
        throw error;
    }
};

export const sendPasswordResetEmail = async (email: string, code: string) => {
    try {
        const mailOptions = {
            from: `"SoulLink Support" <${env.SMTP_USER}>`,
            to: email,
            subject: 'SoulLink - Reset Your Password',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #9d50bb; margin: 0;">SoulLink</h1>
                    </div>
                    <div style="padding: 20px; border-top: 2px solid #e74c3c;">
                        <h2 style="color: #333333; margin-bottom: 20px;">Password Reset Request</h2>
                        <p style="font-size: 16px; color: #555555; line-height: 1.5;">
                            We received a request to reset your password. Use the code below to proceed. If you didn't request this, you can safely ignore this email.
                        </p>
                        <div style="text-align: center; padding: 30px; background-color: #f9f9f9; border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 36px; font-weight: 800; color: #e74c3c; letter-spacing: 5px;">${code}</span>
                        </div>
                        <p style="font-size: 14px; color: #888888; text-align: center;">
                            This code will expire in 15 minutes.
                        </p>
                    </div>
                    <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #aaaaaa;">
                        <p>&copy; 2026 SoulLink. All rights reserved.</p>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Password reset email sent to ${email}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`Error sending password reset email to ${email}:`, error);
        throw error;
    }
};
