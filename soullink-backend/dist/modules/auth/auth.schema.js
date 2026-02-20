import { z } from 'zod';
export const registerSchema = z.object({
    body: z.object({
        email: z.string().email(),
        phone: z.string().min(8),
        password: z.string().min(8),
        displayName: z.string().min(2),
        handle: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
        dateOfBirth: z.string().pipe(z.coerce.date()),
    }),
});
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string(),
    }),
});
export const otpVerifySchema = z.object({
    body: z.object({
        email: z.string().email(),
        code: z.string().length(6),
    }),
});
