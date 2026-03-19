import { useState, useEffect } from "react";
import { friendService } from "@/services/friendService";

export function useFriendsList() {
    const [friends, setFriends] = useState<any[]>([]);
    const [pending, setPending] = useState<any[]>([]);
    const [sent, setSent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [f, p, s] = await Promise.all([
                friendService.getFriends(),
                friendService.getPendingRequests(),
                friendService.getSentRequests()
            ]);
            setFriends(f.friends || []);
            setPending(p.requests || []);
            setSent(s.requests || []);
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRespond = async (id: string, action: 'accept' | 'decline') => {
        try {
            await friendService.respondToRequest(id, action);
            await fetchData();
        } catch (e: any) {
            console.error("Action failed:", e.message);
            throw e;
        }
    };

    const handleRemove = async (friendshipId: string) => {
        try {
            await friendService.removeFriend(friendshipId);
            await fetchData();
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const handleAddFriend = async (query: string) => {
        try {
            const res = await friendService.searchUsers(query);
            if (res.users[0]) {
                await friendService.requestFriendship(res.users[0].id);
                await fetchData();
                return true;
            } else {
                throw new Error("User not found");
            }
        } catch (e: any) {
            console.error("Search/Request failed", e);
            throw e;
        }
    };

    return {
        friends,
        pending,
        sent,
        loading,
        searchQuery,
        setSearchQuery,
        handleRespond,
        handleRemove,
        handleAddFriend,
        refresh: fetchData
    };
}
