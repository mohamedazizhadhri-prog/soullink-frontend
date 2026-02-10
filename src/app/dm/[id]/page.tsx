"use client";

import { useParams } from "next/navigation";
import { DirectMessageView } from "@/components/views/DirectMessageView";
import { FRIENDS_DATA } from "@/constants/friends";
import { notFound } from "next/navigation";

export default function DynamicDMPage() {
    const params = useParams();
    const id = params.id as string;

    // Find the friend in our "database"
    const friend = FRIENDS_DATA.find(f => f.name.toLowerCase() === id.toLowerCase());

    if (!friend) {
        return notFound();
    }

    return (
        <DirectMessageView
            friendName={friend.name}
            avatar={friend.avatar}
            avatarColor={friend.color}
        />
    );
}
