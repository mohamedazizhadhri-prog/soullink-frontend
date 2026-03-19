import { ApiService } from "./apiService";

export interface ChatMessage {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'GIF';
    createdAt: string;
    isRead: boolean;
}

class ChatService extends ApiService {
    async getDmHistory(receiverId: string): Promise<{ messages: ChatMessage[] }> {
        return this.get<{ messages: ChatMessage[] }>(`/chat/dm/${receiverId}`);
    }

    async sendMessage(receiverId: string, content: string, type: string = 'TEXT'): Promise<{ message: ChatMessage }> {
        return this.post<{ message: ChatMessage }>(`/chat/dm/${receiverId}`, { content, type });
    }

    async markAsRead(receiverId: string): Promise<any> {
        return this.patch(`/chat/dm/${receiverId}/read`);
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
