import { z } from 'zod';
export const updateProfileSchema = z.object({
    body: z.object({
        displayName: z.string().min(2).optional(),
        bio: z.string().max(500).optional(),
        avatarUrl: z.string().url().optional(),
        theme: z.enum(['light', 'dark']).optional(),
        notificationsOn: z.boolean().optional(),
    }),
});
export const updatePrivacySchema = z.object({
    body: z.object({
        privacyProfile: z.enum(['PUBLIC', 'MATCHES_ONLY', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
        privacyEmail: z.enum(['PUBLIC', 'MATCHES_ONLY', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
        privacyPhone: z.enum(['PUBLIC', 'MATCHES_ONLY', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
        privacyBio: z.enum(['PUBLIC', 'MATCHES_ONLY', 'FRIENDS_ONLY', 'PRIVATE']).optional(),
    }),
});
