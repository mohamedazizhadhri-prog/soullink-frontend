import { ApiService } from "./apiService";

export interface PendingFriendRequest {
    id: string;
    sender: {
        id: string;
        displayName: string;
        handle: string;
        avatarUrl: string | null;
    };
    createdAt: string;
}

class FriendService extends ApiService {
    async getPendingRequests(): Promise<{ requests: PendingFriendRequest[] }> {
        return this.get<{ requests: PendingFriendRequest[] }>('/friends/pending');
    }

    async respondToRequest(requestId: string, action: 'accept' | 'decline'): Promise<any> {
        return this.patch(`/friends/${requestId}/respond`, { action });
    }

    async getSentRequests(): Promise<{ requests: any[] }> {
        return this.get<{ requests: any[] }>('/friends/sent');
    }

    async requestFriendship(receiverId: string): Promise<any> {
        return this.post('/friends/request', { receiverId });
    }

    async getFriends(): Promise<{ friends: any[] }> {
        return this.get<{ friends: any[] }>('/friends');
    }

    async removeFriend(friendshipId: string): Promise<any> {
        return this.delete(`/friends/${friendshipId}`);
    }

    async searchUsers(query: string): Promise<{ users: any[] }> {
        return this.get<{ users: any[] }>(`/users/search?q=${query}`);
    }
}

export const friendService = new FriendService();
