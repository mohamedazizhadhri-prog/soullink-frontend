"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useNova } from "@/context/NovaContext";
import { useEffect, useState } from "react";

export function EatSpitOverlay() {
    const { isHunting, huntTarget, eatenElements, isSpitting, homePosition } = useNova();
    const [showVortex, setShowVortex] = useState(false);

    // Vortex Trigger Logic
    useEffect(() => {
        if (isHunting) {
            const timer = setTimeout(() => setShowVortex(true), 1500); // Trigger vortex when Nova arrives
            return () => clearTimeout(timer);
        } else {
            setShowVortex(false);
        }
    }, [isHunting]);

    return (
        <AnimatePresence>
            {(isHunting || isSpitting) && (
                <motion.div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9998,
                        pointerEvents: 'none',
                    }}
                >
                    {/* Vortex Effect at Target */}
                    {showVortex && huntTarget && (
                        <motion.div
                            initial={{ scale: 0, rotate: 0 }}
                            animate={{ scale: [0, 1.5, 0], rotate: 360 }}
                            transition={{ duration: 0.8 }}
                            onAnimationComplete={() => setShowVortex(false)}
                            style={{
                                position: 'absolute',
                                left: huntTarget.x - 40,
                                top: huntTarget.y - 40,
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                border: '3px dashed rgba(123, 104, 238, 0.6)',
                                background: 'radial-gradient(circle, rgba(123, 104, 238, 0.3), transparent)',
                            }}
                        />
                    )}

                    {/* Cinematic Throw Animation */}
                    {isSpitting && eatenElements.length > 0 && homePosition && eatenElements.map((eatenEl, index) => {
                        const startX = homePosition.x;
                        const startY = homePosition.y;
                        const endX = eatenEl.originalRect.left + eatenEl.originalRect.width / 2;
                        const endY = eatenEl.originalRect.top + eatenEl.originalRect.height / 2;

                        // Calculate distance for rotation amount
                        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                        const maxDistance = 1000;
                        const normalizedDistance = Math.min(distance / maxDistance, 1);
                        const maxRotation = 720;
                        const rotation = normalizedDistance * maxRotation;

                        // Calculate arc midpoint (20% higher than straight line)
                        const midX = (startX + endX) / 2;
                        const midY = (startY + endY) / 2 - 100;

                        // Slower duration based on distance
                        const baseDuration = 1.8;
                        const duration = baseDuration + (normalizedDistance * 0.5);

                        return (
                            <motion.div
                                key={eatenEl.id}
                                initial={{
                                    x: startX,
                                    y: startY,
                                    scale: 0.2,
                                    rotate: 0,
                                    opacity: 1,
                                }}
                                animate={{
                                    x: [startX, midX, endX],
                                    y: [startY, midY, endY],
                                    scale: [0.2, 1], // Only 2 keyframes for spring
                                    rotate: [0, rotation / 2, rotation],
                                    opacity: [1, 1, 1],
                                    filter: [
                                        'blur(8px) drop-shadow(0 10px 30px rgba(123, 104, 238, 0.8))',
                                        'blur(4px) drop-shadow(0 5px 15px rgba(123, 104, 238, 0.6))',
                                        'blur(0px) drop-shadow(0 2px 5px rgba(123, 104, 238, 0.3))'
                                    ],
                                }}
                                transition={{
                                    delay: index * 0.1,
                                    duration: duration,
                                    times: [0, 0.5, 1],
                                    x: { ease: [0.6, 0.01, 0.05, 0.95] },
                                    y: { ease: [0.6, 0.01, 0.05, 0.95] },
                                    scale: {
                                        type: 'spring',
                                        stiffness: 150,
                                        damping: 20,
                                        mass: 0.8
                                    },
                                    rotate: {
                                        duration: duration + 0.1,
                                        ease: "easeOut"
                                    },
                                    filter: { ease: "easeOut" },
                                }}
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: eatenEl.originalRect.width,
                                    height: eatenEl.originalRect.height,
                                    marginLeft: -eatenEl.originalRect.width / 2,
                                    marginTop: -eatenEl.originalRect.height / 2,
                                    background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.2), rgba(255, 255, 255, 0.1))',
                                    border: '2px solid rgba(123, 104, 238, 0.6)',
                                    borderRadius: '12px',
                                    zIndex: 9999,
                                    pointerEvents: 'none',
                                    backdropFilter: 'blur(4px)',
                                }}
                            />
                        );
                    })}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
