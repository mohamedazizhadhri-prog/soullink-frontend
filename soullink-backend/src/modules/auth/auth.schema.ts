import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().min(5).optional().or(z.literal('')),
        password: z.string().min(8),
        displayName: z.string().min(2),
        handle: z.string().min(2).regex(/^@?[a-zA-Z0-9._]+$/),
        dateOfBirth: z.string().min(1, "Date of birth is required").pipe(
            z.coerce.date().refine((date) => {
                const eighteenYearsAgo = new Date();
                eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                return date <= eighteenYearsAgo;
            }, "You must be at least 18 years old to join SoulLink")
        ),
        city: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        faceDescriptor: z.array(z.number()).optional(),
    }).refine(data => data.email || data.phone, {
        message: "Either email or phone must be provided",
        path: ["email"]
    }),
});

export const loginSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, "Email or phone is required"),
        password: z.string(),
    }),
});

export const otpVerifySchema = z.object({
    body: z.object({
        identifier: z.string().min(1, "Email or phone is required"),
        code: z.string().length(6),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, "Email or phone is required"),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, "Email or phone is required"),
        code: z.string().length(6),
        newPassword: z.string().min(8),
    }),
});
