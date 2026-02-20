import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;
export const hashPassword = async (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};
export const comparePasswords = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
