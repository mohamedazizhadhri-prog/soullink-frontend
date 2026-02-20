import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export const generateAccessToken = (userId: string): string => {
    return jwt.sign({ userId }, String(env.JWT_ACCESS_SECRET), {
        expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });
};

export const generateRefreshToken = (userId: string): string => {
    return jwt.sign({ userId }, String(env.JWT_REFRESH_SECRET), {
        expiresIn: env.JWT_REFRESH_EXPIRY as any,
    });
};

export const verifyAccessToken = (token: string): any => {
    return jwt.verify(token, String(env.JWT_ACCESS_SECRET));
};

export const verifyRefreshToken = (token: string): any => {
    return jwt.verify(token, String(env.JWT_REFRESH_SECRET));
};
