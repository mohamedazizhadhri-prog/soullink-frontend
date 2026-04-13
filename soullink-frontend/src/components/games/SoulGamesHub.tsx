"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, CheckCircle2, Play, ChevronRight, Loader2 } from 'lucide-react';
import styles from './SoulGamesHub.module.css';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface GameSummary {
    id: string;
    slug: string;
    title: string;
    description: string;
    theme: string;
    color: string;
    icon: string;
    episode: number;
    mandatory: boolean;
    totalScenes: number;
    answeredScenes: number;
    isCompleted: boolean;
    isLocked: boolean;
}

export function SoulGamesHub() {
    const router = useRouter();
    const [games, setGames] = useState<GameSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const res = await api.get('/soulgames');
            setGames(res.data.data.games);
        } catch (err) {
            console.error('Failed to fetch games:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredGames = games.filter(g => filter === 'all' || g.theme === filter);

    if (loading) {
        return (
            <div className={styles.hubContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={40} className={styles.spinner} />
            </div>
        );
    }

    return (
        <div className={styles.hubContainer}>
            <header className={styles.hubHeader}>
                <motion.h1
                    className={styles.title}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Soul Games
                </motion.h1>
                <motion.p
                    className={styles.subtitle}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.9 }}
                    transition={{ delay: 0.2 }}
                >
                    Discover your personality through immersive story journeys
                </motion.p>
            </header>

            <div className={styles.filters}>
                {['all', 'personality', 'love', 'philosophy', 'growth'].map((f) => (
                    <button
                        key={f}
                        className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <motion.div className={styles.gameGrid} layout>
                <AnimatePresence mode="popLayout">
                    {filteredGames.map((game, idx) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: idx * 0.1 }}
                            layout
                        >
                            <GameCard game={game} />
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

function GameCard({ game }: { game: GameSummary }) {
    const router = useRouter();
    const progress = game.totalScenes > 0 ? (game.answeredScenes / game.totalScenes) * 100 : 0;
    const inProgress = game.answeredScenes > 0 && !game.isCompleted;

    const handleClick = () => {
        if (game.isLocked) return;
        router.push(`/games/${game.id}`);
    };

    const getStatusLabel = () => {
        if (game.isLocked) return { text: 'Locked', color: '#64748B', icon: <Lock size={14} /> };
        if (game.isCompleted) return { text: 'Completed', color: '#10B981', icon: <CheckCircle2 size={14} /> };
        if (inProgress) return { text: `${game.answeredScenes}/${game.totalScenes}`, color: game.color, icon: <ChevronRight size={14} /> };
        return { text: 'Not Started', color: '#CBD5E1', icon: null };
    };

    const status = getStatusLabel();

    const getButtonLabel = () => {
        if (game.isLocked) return '🔒 Complete Previous Episode';
        if (game.isCompleted) return '✨ View Results';
        if (inProgress) return '▶ Continue';
        return '🚀 Start Episode';
    };

    return (
        <motion.div
            className={styles.card}
            whileHover={game.isLocked ? {} : {
                boxShadow: `0 20px 40px ${game.color}33`,
                borderColor: game.color
            }}
            onClick={handleClick}
            style={{
                border: `2px solid transparent`,
                opacity: game.isLocked ? 0.5 : 1,
                cursor: game.isLocked ? 'not-allowed' : 'pointer',
            }}
        >
            {game.isCompleted && (
                <div className={styles.badge}>
                    <CheckCircle2 size={14} /> Complete
                </div>
            )}
            {game.mandatory && !game.isCompleted && (
                <div className={styles.badge} style={{ background: '#EF4444' }}>
                    ⚡ Required
                </div>
            )}

            <div className={styles.circle} style={{ backgroundColor: game.color }}>
                <span style={{ fontSize: '2rem' }}>{game.icon}</span>
            </div>

            <div style={{ color: game.color, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                Episode {game.episode} · {game.theme}
            </div>

            <h3 className={styles.gameTitle}>{game.title}</h3>
            <p className={styles.gameDescription}>{game.description}</p>

            {/* Progress bar */}
            {(inProgress || game.isCompleted) && (
                <div style={{ width: '100%', marginBottom: '1rem' }}>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${game.isCompleted ? 100 : progress}%`,
                            background: game.color,
                            borderRadius: '2px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>
            )}

            <div className={styles.status}>
                <div className={styles.dot} style={{ backgroundColor: status.color }} />
                <span style={{ color: status.color }}>
                    {status.text}
                </span>
            </div>

            <button
                className={styles.actionBtn}
                style={{
                    backgroundColor: game.isLocked ? '#374151' : game.isCompleted ? '#1e293b' : game.color,
                    color: game.isLocked ? '#6B7280' : 'white'
                }}
            >
                {getButtonLabel()}
            </button>
        </motion.div>
    );
}
