import { ApiService } from "./apiService";

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'GIF';
    createdAt: string;
    isRead: boolean;
    isPinned: boolean;
    replyTo?: {
        content: string;
        sender: {
            displayName: string;
        };
    };
}

class ChatService extends ApiService {
    async getDmHistory(receiverId: string): Promise<{ messages: ChatMessage[] }> {
        return this.get<{ messages: ChatMessage[] }>(`/chat/${receiverId}`);
    }

    async sendMessage(receiverId: string, content: string, type: string = 'TEXT', replyToId?: string): Promise<{ message: ChatMessage }> {
        return this.post<{ message: ChatMessage }>(`/chat/${receiverId}`, { content, type, replyToId });
    }

    async sendUnifiedMessage(receiverId: string, content: string, attachment?: File, type: string = 'TEXT', replyToId?: string): Promise<{ message: ChatMessage }> {
        const formData = new FormData();
        if (content) formData.append('content', content);
        if (type) formData.append('type', type);
        if (replyToId) formData.append('replyToId', replyToId);
        if (attachment) formData.append('file', attachment);

        return this.post<{ message: ChatMessage }>(`/chat/${receiverId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }

    async markAsRead(receiverId: string): Promise<any> {
        return this.patch(`/chat/${receiverId}/mark-read`);
    }

    async togglePin(receiverId: string, messageId: string): Promise<{ message: ChatMessage }> {
        return this.patch<{ message: ChatMessage }>(`/chat/${receiverId}/messages/${messageId}/pin`, { friendId: receiverId });
    }

    async getPinnedMessages(receiverId: string): Promise<{ messages: ChatMessage[] }> {
        return this.get<{ messages: ChatMessage[] }>(`/chat/${receiverId}/pinned`);
    }

    async searchMessages(friendId: string, query: string): Promise<{ messages: ChatMessage[] }> {
        return this.get<{ messages: ChatMessage[] }>(`/chat/search?friendId=${friendId}&query=${query}`);
    }

    async uploadFile(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return this.post<{ url: string }>('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
}

export const chatService = new ChatService();
