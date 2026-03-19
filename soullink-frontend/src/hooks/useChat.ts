import { useState, useEffect, useRef } from "react";
import { chatService, ChatMessage } from "@/services/chatService";
import { friendService } from "@/services/friendService";
import { socketService } from "@/lib/socket";

export function useChat(receiverId: string, onSendMessageError?: () => void) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [friend, setFriend] = useState<any>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const typingTimeoutRef = useRef<any>(null);

    useEffect(() => {
        const fetchContext = async () => {
            try {
                const [historyData, friendsData] = await Promise.all([
                    chatService.getDmHistory(receiverId),
                    friendService.getFriends()
                ]);
                setMessages(historyData.messages);
                const friendInfo = friendsData.friends.find((f: any) => f.id === receiverId);
                setFriend(friendInfo);
                await chatService.markAsRead(receiverId);
            } catch (error) {
                console.error("Failed to load DM context:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContext();

        socketService.connect();
        socketService.emit('dm:join', receiverId);

        const handleNewMessage = (data: any) => {
            const incoming = data.message || data;
            if (incoming.senderId === receiverId || incoming.receiverId === receiverId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === incoming.id)) return prev;
                    return [...prev, incoming];
                });
                if (incoming.senderId === receiverId) {
                    chatService.markAsRead(receiverId).catch(console.error);
                }
            }
        };

        const handleTyping = (data: any) => {
            if (data.senderId === receiverId) {
                setIsTyping(data.isTyping);
            }
        };

        socketService.on('dm:message', handleNewMessage);
        socketService.on('dm:typing', handleTyping);

        return () => {
            socketService.off('dm:message', handleNewMessage);
            socketService.off('dm:typing', handleTyping);
        };
    }, [receiverId]);

    const handleSend = async (content: string, type: string = 'TEXT') => {
        try {
            const res = await chatService.sendMessage(receiverId, content, type);
            setMessages(prev => [...prev, res.message]);
            return res.message;
        } catch (error) {
            console.error("Failed to send message:", error);
            onSendMessageError?.();
            throw error;
        }
    };

    const handleFileUpload = async (file: File) => {
        try {
            const uploadRes = await chatService.uploadFile(file);
            const fileUrl = uploadRes.url;

            let type = 'FILE';
            if (file.type.startsWith('image/')) type = 'IMAGE';
            if (file.type.startsWith('video/')) type = 'VIDEO';
            if (file.type === 'image/gif') type = 'GIF';

            return await handleSend(fileUrl, type);
        } catch (error) {
            console.error("Upload failed:", error);
            throw error;
        }
    };

    const emitTyping = (isTyping: boolean) => {
        socketService.emit('dm:typing', { receiverId, isTyping });
        if (isTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketService.emit('dm:typing', { receiverId, isTyping: false });
            }, 2000);
        }
    };

    return {
        messages,
        friend,
        isTyping,
        loading,
        handleSend,
        handleFileUpload,
        emitTyping
    };
}
