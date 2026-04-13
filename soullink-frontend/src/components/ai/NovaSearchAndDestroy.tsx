"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNova } from "@/context/NovaContext";

export function NovaSearchAndDestroy() {
    const {
        isKillingMachine, setIsKillingMachine, targetingData, setTargetingData,
        isFiring, setIsFiring, novaPosition, addMessage, setMood
    } = useNova();
    const [laserPath, setLaserPath] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [showEliminated, setShowEliminated] = useState(false);
    const targetRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isKillingMachine || !targetingData || targetingData.elementId !== 'auto-search') return;

        const performSearchAndDestroy = async () => {
            // Phase 2: Lock-On - Search restricted to latest USER message
            const chatContainer = document.querySelector('[data-nova-chat-container]');
            if (!chatContainer) return;

            // Specifically find the last message sent by the user
            const userMessages = chatContainer.querySelectorAll('[data-msg-sender="user"]');
            if (userMessages.length === 0) return;
            const latestUserBubble = userMessages[userMessages.length - 1];

            const walker = document.createTreeWalker(latestUserBubble, NodeFilter.SHOW_TEXT, null);
            let node;
            const regex = new RegExp(targetingData.text, 'gi');
            let lastNodeInBubble: Text | null = null;

            while (node = walker.nextNode()) {
                if (node.textContent?.match(regex)) {
                    lastNodeInBubble = node as Text;
                }
            }
            const foundNode = lastNodeInBubble;

            if (foundNode && foundNode.parentElement) {
                const parent = foundNode.parentElement;
                // Avoid wrapping if already targeted
                if (parent.id === 'nova-target') return;

                const text = foundNode.textContent || "";
                const matches = text.match(regex);
                if (!matches) return;

                const match = matches[matches.length - 1]; // Last match in this text node
                const parts = text.split(regex);

                // Wrap the target word (specifically the last one if multiple in same node)
                // Simplified wrap: just replace the first match for now, or rebuild carefully
                // Given typical AI names are unique in a sentence, parts.join(...) is tricky
                // Let's do a more robust wrap:
                parent.innerHTML = '';
                const beforeIdx = text.lastIndexOf(match);
                const beforeText = text.slice(0, beforeIdx);
                const afterText = text.slice(beforeIdx + match.length);

                parent.appendChild(document.createTextNode(beforeText));
                const span = document.createElement('span');
                span.id = 'nova-target';
                span.style.color = 'inherit';
                span.style.transition = 'all 0.5s ease-out';
                span.textContent = match;
                parent.appendChild(span);
                parent.appendChild(document.createTextNode(afterText));

                targetRef.current = span;
                const rect = span.getBoundingClientRect();

                setTargetingData({
                    ...targetingData,
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    width: rect.width,
                    height: rect.height,
                    elementId: 'nova-target'
                });

                // Phase 3: Laser Blast
                setTimeout(() => {
                    setIsFiring(true);

                    // Center of target
                    const targetCenterX = rect.left + rect.width / 2;
                    const targetCenterY = rect.top + rect.height / 2;

                    // Current Clamped Position of Nova (matching NovaAvatar logic)
                    const novaX = targetCenterX;
                    const novaY = Math.max(80, targetCenterY - 150) + 32;

                    setLaserPath({
                        x1: novaX,
                        y1: novaY,
                        x2: targetCenterX,
                        y2: targetCenterY
                    });

                    // Destruction sequence
                    setTimeout(() => {
                        if (targetRef.current) {
                            targetRef.current.style.color = '#333';
                            targetRef.current.style.textDecoration = 'line-through';
                            targetRef.current.style.filter = 'blur(2px) grayscale(1)';
                            targetRef.current.style.transform = 'translateY(10px) rotate(5deg)';
                            targetRef.current.style.opacity = '0.5';
                        }

                        setTimeout(() => {
                            setIsFiring(false);
                            setLaserPath(null);
                            if (targetRef.current) {
                                targetRef.current.innerHTML = '💀 [ELIMINATED]';
                                targetRef.current.style.color = '#ef4444';
                                targetRef.current.style.fontWeight = 'bold';
                                targetRef.current.style.filter = 'none';
                                targetRef.current.style.opacity = '1';
                            }

                            // Return to neutral/smug
                            setTimeout(() => {
                                setIsKillingMachine(false);
                                setTargetingData(null);
                                setMood('neutral');
                                addMessage("Target eliminated. Inferior AI detected and purged.", 'nova');
                            }, 2000);
                        }, 500);
                    }, 150);
                }, 1500); // Delay for lock-on animation
            } else {
                // If not found in DOM, cancel
                setIsKillingMachine(false);
                setTargetingData(null);
            }
        };

        performSearchAndDestroy();
    }, [isKillingMachine, targetingData, setIsKillingMachine, setTargetingData, setIsFiring, setMood, addMessage]);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100000 }}>
            {laserPath && (
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <motion.line
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        exit={{ opacity: 0 }}
                        x1={laserPath.x1}
                        y1={laserPath.y1}
                        x2={laserPath.x2}
                        y2={laserPath.y2}
                        stroke="#fff"
                        strokeWidth="3"
                        style={{ filter: 'drop-shadow(0 0 10px #ff0000)' }}
                    />
                    <motion.line
                        x1={laserPath.x1}
                        y1={laserPath.y1}
                        x2={laserPath.x2}
                        y2={laserPath.y2}
                        stroke="#ff0000"
                        strokeWidth="8"
                        strokeOpacity="0.3"
                        style={{ filter: 'blur(4px)' }}
                    />
                </svg>
            )}

            {isKillingMachine && targetingData && !isFiring && (
                <motion.div
                    initial={{ opacity: 0, scale: 2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        position: 'absolute',
                        left: targetingData.x - 40,
                        top: targetingData.y - 40,
                        width: 80,
                        height: 80,
                        border: '2px solid #ef4444',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ color: '#ef4444', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }}>
                        LOCKING ON...
                    </div>
                </motion.div>
            )}
        </div>
    );
}
