import { z } from 'zod';
export const registerSchema = z.object({
    body: z.object({
        email: z.string().email(),
        phone: z.string().min(5),
        password: z.string().min(8),
        displayName: z.string().min(2),
        handle: z.string().min(2).regex(/^@?[a-zA-Z0-9._]+$/),
        dateOfBirth: z.string().min(1, "Date of birth is required").pipe(z.coerce.date()),
        faceDescriptor: z.array(z.number()).optional(),
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
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});
export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(8),
    }),
});
