import { FriendshipStatus, OnlineStatus } from '@prisma/client';

export interface FriendResponse {
    id: string;
    friendshipId: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    status: OnlineStatus;
}

export interface FriendRequestResponse {
    id: string;
    sender: {
        id: string;
        displayName: string;
        handle: string;
        avatarUrl: string | null;
    };
    createdAt: Date;
}
