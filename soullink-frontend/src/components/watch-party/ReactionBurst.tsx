"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WatchReaction } from '@/types/watch-party.types';

interface ReactionBurstProps {
    reactions: WatchReaction[];
}

export function ReactionBurst({ reactions }: ReactionBurstProps) {
    const [localReactions, setLocalReactions] = useState<(WatchReaction & { id: number; x: number })[]>([]);

    useEffect(() => {
        if (reactions.length === 0) return;

        const latest = reactions[reactions.length - 1];
        const id = Date.now() + Math.random();
        const x = Math.random() * 80 + 10; // 10% to 90% horizontal range

        setLocalReactions(prev => [...prev, { ...latest, id, x }]);

        // Cleanup after 3 seconds
        const timer = setTimeout(() => {
            setLocalReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);

        return () => clearTimeout(timer);
    }, [reactions]);

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 50 }}>
            <AnimatePresence>
                {localReactions.map((r) => (
                    <motion.div
                        key={r.id}
                        initial={{ y: '100%', opacity: 0, x: `${r.x}%`, scale: 0.5 }}
                        animate={{ y: '20%', opacity: 1, scale: 1.5 }}
                        exit={{ y: '0%', opacity: 0, scale: 2 }}
                        transition={{ duration: 2.5, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            fontSize: '32px',
                            textShadow: '0 0 10px rgba(123, 104, 238, 0.5)'
                        }}
                    >
                        {r.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
