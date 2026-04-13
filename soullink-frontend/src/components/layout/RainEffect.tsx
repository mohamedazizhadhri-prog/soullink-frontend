"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNova } from "@/context/NovaContext";
import styles from "./RainEffect.module.css";

interface RainDrop {
    id: number;
    left: string;
    delay: number;
    duration: number;
}

export function RainEffect() {
    const { isStormMode, triggerSplash } = useNova();
    const [drops, setDrops] = useState<RainDrop[]>([]);

    useEffect(() => {
        if (isStormMode) {
            const newDrops = Array.from({ length: 30 }, (_, i) => ({
                id: i,
                left: `${Math.random() * 100}%`,
                delay: Math.random() * 2,
                duration: 0.5 + Math.random() * 0.5,
            }));
            setDrops(newDrops);
        } else {
            setDrops([]);
        }
    }, [isStormMode]);

    return (
        <div className={styles.rainContainer}>
            <AnimatePresence>
                {isStormMode && drops.map((drop) => (
                    <motion.div
                        key={drop.id}
                        className={styles.rainDrop}
                        style={{ left: drop.left }}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{
                            y: "100vh",
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            duration: drop.duration,
                            repeat: Infinity,
                            delay: drop.delay,
                            ease: "linear",
                        }}
                        onUpdate={(latest: any) => {
                            // Simple collision logic: if drop is near top-left (where Nova is)
                            const y = parseFloat(latest.y as string);
                            if (y > 50 && y < 150 && Math.random() > 0.98) {
                                triggerSplash();
                            }
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
