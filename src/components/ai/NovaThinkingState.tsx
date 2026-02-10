"use client";

import React from "react";
import { motion } from "framer-motion";

export function NovaThinkingState() {
    return (
        <>
            {/* Anime Thought Bubble (Top Right) - Adjusted Placement */}
            <motion.div
                initial={{ scale: 0, opacity: 0, x: 10, y: 10 }}
                animate={{ scale: [0, 1.1, 1], opacity: 1, x: 0, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "backOut" }}
                style={{
                    position: "absolute",
                    top: -100, // Move higher up
                    right: -80, // Move further right
                    pointerEvents: "none",
                    zIndex: 100,
                    filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.15))",
                    width: 140,
                    height: 100
                }}
            >
                {/* Floating Animation Wrapper */}
                <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    {/* Cloud SVG - No Lamp */}
                    <svg width="100%" height="100%" viewBox="0 0 100 80" fill="white">
                        <path d="M28.5,35 C18.5,35 10,28 10,20 C10,12 18.5,5 28.5,5 C32,5 35,6 38,8 C42,2 48,0 55,0 C68,0 79,8 82,19 C83,19 84,19 85,19 C93,19 100,25 100,32 C100,39 93,45 85,45 L28.5,45 C28.5,45 28.5,45 28.5,35 Z" />
                        <circle cx="10" cy="55" r="5" fill="white" />
                        <circle cx="2" cy="62" r="3" fill="white" />
                    </svg>

                    {/* Subtle "dots" instead of lamp for flavor */}
                    <motion.div
                        style={{ position: 'absolute', top: 18, left: 40, display: 'flex', gap: 4 }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#EEE' }} />
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#EEE' }} />
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#EEE' }} />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Thinking Hand (Bottom Left) - Adjusted size and placement */}
            <motion.div
                initial={{ x: -15, y: 15, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={{ x: -15, y: 15, opacity: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                style={{
                    position: "absolute",
                    bottom: -22, // Tucked closer
                    left: -20, // Tucked closer
                    pointerEvents: "none",
                    zIndex: 110,
                    filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.25))",
                    width: 45, // Slightly smaller (from 50)
                    height: 45
                }}
            >
                {/* stroking Animation */}
                <motion.div
                    animate={{
                        y: [0, -3, 0],
                        rotate: [-12, -8, -12],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M30,40 C30,25 38,15 50,15 C62,15 75,25 75,45 V70 C75,85 62,95 50,95 C38,95 30,85 30,70 V40 Z"
                            fill="white"
                            stroke="#EAEAEA"
                            strokeWidth="3"
                        />
                        <path
                            d="M75,55 C88,55 95,65 92,75 C89,85 80,82 75,78 C75,75 75,70 75,65"
                            fill="white"
                            stroke="#EAEAEA"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path d="M42,20 V35" stroke="#F5F5F5" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M58,20 V35" stroke="#F5F5F5" strokeWidth="2.5" strokeLinecap="round" />
                        <rect x="38" y="90" width="24" height="6" rx="1.5" fill="#F0F0F0" />
                    </svg>
                </motion.div>
            </motion.div>
        </>
    );
}
