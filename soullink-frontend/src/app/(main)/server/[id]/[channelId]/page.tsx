"use client";

import React, { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import { ServerView } from "@/components/views/ServerView";
import { ServerErrorBoundary } from "@/components/views/ServerErrorBoundary";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function DynamicChannelPage() {
    const params = useParams();
    const serverId = params.id as string;
    const channelId = params.channelId as string;

    const [server, setServer] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchServer = async () => {
            try {
                const response = await api.get(`/communities/${serverId}`);
                setServer(response.data.data.community);
            } catch (err) {
                console.error("Failed to fetch community:", err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchServer();
    }, [serverId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-white/50">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (error || !server) {
        return notFound();
    }

    return (
        <ServerErrorBoundary>
            <ServerView server={server} channelId={channelId} />
        </ServerErrorBoundary>
    );
}
