"use client";

import { useParams } from "next/navigation";
import { ServerView } from "@/components/views/ServerView";
import { SERVERS_DATA } from "@/constants/servers";
import { notFound } from "next/navigation";

export default function DynamicServerPage() {
    const params = useParams();
    const id = params.id as string;

    const server = SERVERS_DATA.find(s => s.id === id);

    if (!server) {
        return notFound();
    }

    return <ServerView server={server} />;
}
