"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNova } from "@/context/NovaContext";

export function NovaEmotes() {
    const { mood, emote } = useNova();

    // Emote Variants
    const popVariant = {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: [0, 1.2, 1], opacity: 1 },
        exit: { scale: 0, opacity: 0 },
        transition: { duration: 0.3 }
    };

    return (
        <AnimatePresence>
            {(emote === "angry" || emote === "shake") && (
                <motion.div {...popVariant} style={{ position: 'absolute', top: -10, right: -10, pointerEvents: 'none', zIndex: 10 }}>
                    {/* Red Vein Mark */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF0000" strokeWidth="3" strokeLinecap="round">
                        <path d="M4 12h6M12 4v6M18 10l-4 4M8 16l4-4" />
                    </svg>
                </motion.div>
            )}

            {/* Lightbulb Overlay */}
            {(emote === "lightbulb") && (
                <motion.div
                    {...popVariant}
                    style={{ position: 'absolute', top: -40, pointerEvents: 'none', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'center' }}
                >
                    {/* Flickering Lightbulb */}
                    <motion.svg
                        width="32" height="32" viewBox="0 0 24 24"
                        fill="#FFD700" stroke="#FFA500" strokeWidth="2"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 0.2, repeat: Infinity, repeatType: "reverse" }}
                    >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" />
                    </motion.svg>
                </motion.div>
            )}

            {/* Anime Blush Overlay */}
            {(emote === "blush" || mood === "blushed" || mood === "love") && (
                <motion.div {...popVariant} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                    {/* Anime Blush Lines */}
                    <div style={{ position: 'absolute', top: 25, left: 12, width: 12, height: 3, background: 'rgba(255,105,180, 0.8)', transform: 'rotate(-45deg)' }} />
                    <div style={{ position: 'absolute', top: 30, left: 16, width: 12, height: 3, background: 'rgba(255,105,180, 0.8)', transform: 'rotate(-45deg)' }} />

                    <div style={{ position: 'absolute', top: 25, right: 12, width: 12, height: 3, background: 'rgba(255,105,180, 0.8)', transform: 'rotate(-45deg)' }} />
                    <div style={{ position: 'absolute', top: 30, right: 16, width: 12, height: 3, background: 'rgba(255,105,180, 0.8)', transform: 'rotate(-45deg)' }} />
                </motion.div>
            )}

            {emote === "oops" && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{
                        opacity: [0, 1, 1, 0],
                        y: [-20, 0, 40]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: 1.5,
                        times: [0, 0.2, 0.8, 1],
                        ease: "easeIn"
                    }}
                    style={{ position: 'absolute', top: 0, right: -15, pointerEvents: 'none', zIndex: 10 }}
                >
                    {/* Sweat Drop */}
                    <svg width="24" height="32" viewBox="0 0 24 32" fill="#00BFFF">
                        <path d="M12 2C12 2 4 14 4 20C4 25 8 29 12 29C16 29 20 25 20 20C20 14 12 2 12 2Z" />
                    </svg>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
