import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};
export const prisma = globalThis.prisma ?? prismaClientSingleton();
if (env.NODE_ENV !== 'production')
    globalThis.prisma = prisma;
