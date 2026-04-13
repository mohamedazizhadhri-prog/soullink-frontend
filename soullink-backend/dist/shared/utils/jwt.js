import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
export const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, String(env.JWT_ACCESS_SECRET), {
        expiresIn: env.JWT_ACCESS_EXPIRY,
    });
};
export const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, String(env.JWT_REFRESH_SECRET), {
        expiresIn: env.JWT_REFRESH_EXPIRY,
    });
};
export const verifyAccessToken = (token) => {
    return jwt.verify(token, String(env.JWT_ACCESS_SECRET));
};
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, String(env.JWT_REFRESH_SECRET));
};
