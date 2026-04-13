"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle } from 'lucide-react';
import styles from './SoulGamesHub.module.css';
import { SoulGame } from '@/constants/soulGames';
import { useRouter } from 'next/navigation';

interface Props {
    game: SoulGame;
    isCompleted: boolean;
    onHover: (color: string) => void;
    onHoverEnd: () => void;
}

export function SoulGameCard({ game, isCompleted, onHover, onHoverEnd }: Props) {
    const router = useRouter();

    return (
        <motion.div
            className={styles.card}
            whileHover={{
                boxShadow: `0 20px 40px ${game.color}33`,
                borderColor: game.color
            }}
            onMouseEnter={() => onHover(game.color)}
            onMouseLeave={() => onHoverEnd()}
            onClick={() => router.push(`/games/${game.id}`)}
            style={{ border: `2px solid transparent` }}
        >
            {isCompleted && (
                <div className={styles.badge}>
                    <Heart size={14} fill="white" /> Unlocked
                </div>
            )}

            <div className={styles.circle} style={{ backgroundColor: '#EF4444' }}>
                {game.icon}
            </div>

            <div className={styles.themeLabel} style={{ color: game.color, fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                {game.theme}
            </div>

            <h3 className={styles.gameTitle}>{game.title}</h3>
            <p className={styles.gameDescription}>{game.description}</p>

            <div className={styles.status}>
                <div className={styles.dot} style={{ backgroundColor: isCompleted ? '#10B981' : '#CBD5E1' }} />
                <span style={{ color: isCompleted ? '#10B981' : '#64748B' }}>
                    {isCompleted ? 'Completed' : 'Not Started'}
                </span>
            </div>

            <button
                className={styles.actionBtn}
                style={{
                    backgroundColor: isCompleted ? '#f3f4f6' : game.color,
                    color: isCompleted ? '#374151' : 'white'
                }}
            >
                {isCompleted ? 'View Results' : 'Start Episode'}
            </button>
        </motion.div>
    );
}
