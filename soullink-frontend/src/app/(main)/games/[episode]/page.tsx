"use client";

import { useParams } from "next/navigation";
import { SoulGameSession } from "@/components/games/SoulGameSession";

export default function GameEpisodePage() {
    const params = useParams();
    const gameId = params.episode as string;

    return <SoulGameSession gameId={gameId} />;
}
