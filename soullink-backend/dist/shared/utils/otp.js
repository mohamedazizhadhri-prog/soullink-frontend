import crypto from 'crypto';
export const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[crypto.randomInt(0, 10)];
    }
    return otp;
};
export const generateToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};
