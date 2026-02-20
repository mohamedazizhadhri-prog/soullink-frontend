import crypto from 'crypto';

export const generateOTP = (length: number = 6): string => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[crypto.randomInt(0, 10)];
    }
    return otp;
};

export const generateToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};
