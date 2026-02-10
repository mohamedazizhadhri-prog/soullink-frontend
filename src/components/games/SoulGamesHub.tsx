"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import styles from './SoulGamesHub.module.css';
import { SOUL_GAMES, SoulGameTheme } from '@/constants/soulGames';
import { SoulGameCard } from './SoulGameCard';
import { useNova } from '@/context/NovaContext';

export function SoulGamesHub() {
    const [filter, setFilter] = useState<SoulGameTheme | 'all'>('all');
    const { addMessage, setMood } = useNova();
    const [completedGames, setCompletedGames] = useState<string[]>([]);
    const hoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        const completed = SOUL_GAMES
            .filter(g => localStorage.getItem(`soul-game-${g.id}`))
            .map(g => g.id);
        setCompletedGames(completed);

        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, []);

    const handleHoverStart = (color: string) => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            setMood('curious');
        }, 6000); // 6 seconds delay as requested
    };

    const handleHoverEnd = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    };

    const filteredGames = SOUL_GAMES.filter(g => filter === 'all' || g.theme === filter);

    return (
        <div className={styles.hubContainer}>
            <header className={styles.hubHeader}>
                <motion.h1
                    className={styles.title}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    SoulLink Games
                </motion.h1>
                <motion.p
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.9 }}
                    transition={{ delay: 0.2 }}
                >
                    Discover your soul through interactive journeys
                </motion.p>
            </header>

            <div className={styles.filters}>
                {['all', 'personality', 'love', 'philosophy', 'growth'].map((f) => (
                    <button
                        key={f}
                        className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`}
                        onClick={() => setFilter(f as any)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <motion.div
                className={styles.gameGrid}
                layout
            >
                <AnimatePresence mode="popLayout">
                    {filteredGames.map((game: any, idx: number) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: idx * 0.1 }}
                            layout
                        >
                            <SoulGameCard
                                game={game}
                                isCompleted={completedGames.includes(game.id)}
                                onHover={handleHoverStart}
                                onHoverEnd={handleHoverEnd}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {filteredGames.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.5 }}>
                    <Sparkles size={48} style={{ marginBottom: '1rem' }} />
                    <p>More soul journeys coming soon...</p>
                </div>
            )}
        </div>
    );
}
