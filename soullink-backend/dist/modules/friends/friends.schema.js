import { z } from 'zod';
export const sendFriendRequestSchema = z.object({
    body: z.object({
        receiverId: z.string().uuid(),
    }),
});
export const respondFriendRequestSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        action: z.enum(['accept', 'decline']),
    }),
});
