import { z } from 'zod';

export const createCommunitySchema = z.object({
    body: z.object({
        name: z.string().min(3).max(50),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().default(true),
    }),
});

export const updateCommunitySchema = z.object({
    body: z.object({
        name: z.string().min(3).max(50).optional(),
        description: z.string().max(500).optional(),
        isPublic: z.boolean().optional(),
        iconUrl: z.string().url().optional(),
        bannerUrl: z.string().url().optional(),
    }),
});

export const joinCommunitySchema = z.object({
    body: z.object({
        inviteCode: z.string().length(8),
    }),
});

export const sendMessageSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
        channelId: z.string().uuid(),
    }),
    body: z.object({
        content: z.string().min(1).max(2000),
    }),
});
