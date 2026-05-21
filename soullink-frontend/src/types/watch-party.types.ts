/**
 * YouTube Watch Party Types
 */

export interface WatchSession {
    id: string;
    hostId: string;
    context: 'dm' | 'community' | 'match';
    contextId: string;
    videoId: string | null;
    videoTitle: string | null;
    isPlaying: boolean;
    timestamp: number; // current time in seconds
    members: WatchMember[];
}

export interface WatchMember {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface WatchInvite {
    sessionId: string;
    hostId: string;
    hostName: string;
    hostAvatar: string | null;
    videoId: string | null;
    videoTitle: string | null;
}

export interface WatchReaction {
    userId: string;
    displayName: string;
    emoji: string;
}
