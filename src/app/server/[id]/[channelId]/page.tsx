"use client";

import { useParams } from "next/navigation";
import { ServerView } from "@/components/views/ServerView";
import { SERVERS_DATA } from "@/constants/servers";
import { notFound } from "next/navigation";

export default function DynamicChannelPage() {
    const params = useParams();
    const serverId = params.id as string;
    const channelId = params.channelId as string;

    const server = SERVERS_DATA.find(s => s.id === serverId);

    if (!server) {
        return notFound();
    }

    return <ServerView server={server} channelId={channelId} />;
}
