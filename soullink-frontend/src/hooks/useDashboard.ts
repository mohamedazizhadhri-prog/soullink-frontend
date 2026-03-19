import { useState, useEffect } from "react";
import { friendService, PendingFriendRequest } from "@/services/friendService";
import { socketService } from "@/lib/socket";

export function useDashboard() {
    const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const data = await friendService.getPendingRequests();
                setPendingRequests(data.requests);
            } catch (err) {
                console.error('Failed to fetch pending requests:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPending();

        socketService.connect();
        const handleNewRequest = (data: { friendship: any, sender: any }) => {
            setPendingRequests(prev => [
                {
                    id: data.friendship.id,
                    sender: data.sender,
                    createdAt: data.friendship.createdAt
                },
                ...prev
            ]);
        };

        socketService.on('friend:request', handleNewRequest);
        return () => {
            socketService.off('friend:request', handleNewRequest);
        };
    }, []);

    const handleRespond = async (requestId: string, action: 'accept' | 'decline') => {
        try {
            await friendService.respondToRequest(requestId, action);
            setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        } catch (err) {
            console.error(`Failed to ${action} request:`, err);
        }
    };

    return {
        pendingRequests,
        isLoading,
        handleRespond
    };
}
