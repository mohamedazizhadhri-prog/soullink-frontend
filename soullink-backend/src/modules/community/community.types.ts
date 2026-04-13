import { ServerRole, ChannelType } from '@prisma/client';

export interface CommunityListItem {
    id: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    memberCount: number;
}

export interface ChannelResponse {
    id: string;
    name: string;
    type: ChannelType;
    groupName: string;
    orderIndex: number;
}

export interface CommunityDetail {
    id: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    bannerUrl: string | null;
    inviteCode: string;
    isPublic: boolean;
    ownerId: string;
    channels: ChannelResponse[];
    _count: {
        members: number;
    };
}
