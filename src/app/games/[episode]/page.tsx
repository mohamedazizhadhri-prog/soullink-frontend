"use client";

import { useParams } from "next/navigation";
import { SoulGameSession } from "@/components/games/SoulGameSession";
import { SOUL_GAMES } from "@/constants/soulGames";

export default function GameEpisodePage() {
    const params = useParams();
    const gameId = params.episode as string;

    const game = SOUL_GAMES.find(g => g.id === gameId);

    if (!game) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Game Not Found</h1>
                    <p style={{ opacity: 0.7 }}>The requested soul journey does not exist.</p>
                </div>
            </div>
        );
    }

    return <SoulGameSession game={game} />;
}
