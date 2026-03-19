"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNova } from "@/context/NovaContext";

export function FocusOverlay() {
    const { isCinematicMode } = useNova();

    return (
        <AnimatePresence>
            {isCinematicMode && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    transition={{
                        duration: 0.8, // Slow dramatic entry
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: '#000', // Total Blackout
                        backdropFilter: 'blur(8px)',
                        zIndex: 140, // High tier blackout
                        pointerEvents: 'none'
                    }}
                />
            )}
        </AnimatePresence>
    );
}
