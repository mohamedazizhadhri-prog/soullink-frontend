"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useAnimate } from 'framer-motion';
import { useNova } from '@/context/NovaContext';
import { NovaBlackHole } from './NovaBlackHole';

// Types for cloned elements
interface ClonedElement {
    id: string;
    rect: DOMRect;
    originalElement: HTMLElement;
    clone: HTMLElement;
}

export function NovaSingularityOverlay() {
    const { isNuclearSingularity, setNuclearSingularity } = useNova();
    const [clones, setClones] = useState<ClonedElement[]>([]);
    const [phase, setPhase] = useState<'idle' | 'initiation' | 'consumption' | 'void' | 'bigbang'>('idle');
    const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
    const [scope, animate] = useAnimate();
    const overlayRef = useRef<HTMLDivElement>(null);

    // 1. INITIATION & CLONING
    useEffect(() => {
        if (!isNuclearSingularity) {
            setPhase('idle');
            return;
        }

        setPhase('initiation');

        // Always center in the viewport for absolute consistency across devices
        setCenterPos({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        });

        // Capture elements after a short delay to allow overlay to mount
        const timer = setTimeout(() => {
            captureAndConsume();
        }, 1000);

        return () => clearTimeout(timer);
    }, [isNuclearSingularity]);

    const captureAndConsume = async () => {
        // IMPROVED SELECTOR STRATEGY:
        const selectors = [
            '[data-singularity-target]', // Targeted Friends/Servers FIRST
            'aside button', 'aside a', 'aside [role="button"]',
            'nav > *',
            'main > div > *', 'main > section > *',
            '.friends-bar > *',
            'main [data-testid="card"]',
            'main button'
        ];

        const candidates = Array.from(document.querySelectorAll(selectors.join(', '))) as HTMLElement[];
        const uniqueTargets = new Set<HTMLElement>();
        candidates.forEach(el => {
            if (el.closest('[data-nova-overlay]')) return;
            if (el.offsetParent === null) return;
            uniqueTargets.add(el);
        });

        const newClones: ClonedElement[] = [];
        let index = 0;

        uniqueTargets.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            if (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9) return;

            const clone = el.cloneNode(true) as HTMLElement;
            clone.style.position = 'absolute';
            clone.style.top = `${rect.top}px`;
            clone.style.left = `${rect.left}px`;
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.margin = '0';
            clone.style.transition = 'none';

            // Priority Z-Index for friends/servers
            const isPriority = el.hasAttribute('data-singularity-target');
            clone.style.zIndex = isPriority ? '2000' : `${1000 + Math.floor(Math.random() * 100)}`;
            clone.style.pointerEvents = 'none';

            el.style.opacity = '0';
            el.style.pointerEvents = 'none';

            newClones.push({ id: `clone-${index++}`, rect, originalElement: el, clone });
        });

        // Fallback if needed... (keep existing logic)
        if (newClones.length < 5) {
            const fallbackTargets = Array.from(document.querySelectorAll('main > *')) as HTMLElement[];
            fallbackTargets.forEach(el => {
                if (el.closest('[data-nova-overlay]') || uniqueTargets.has(el)) return;
                const rect = el.getBoundingClientRect();
                const clone = el.cloneNode(true) as HTMLElement;
                clone.style.position = 'absolute';
                clone.style.top = `${rect.top}px`;
                clone.style.left = `${rect.left}px`;
                clone.style.width = `${rect.width}px`;
                clone.style.height = `${rect.height}px`;
                clone.style.zIndex = `${1000 + Math.floor(Math.random() * 100)}`;
                el.style.opacity = '0';
                newClones.push({ id: `clone-fb-${index++}`, rect, originalElement: el, clone });
            });
        }

        setClones(newClones);
        setPhase('consumption');

        await consumeElements(newClones);
    };

    const consumeElements = async (elements: ClonedElement[]) => {
        // Use the calculated generic center (from main or window)
        // We need to re-fetch the *current* centerPos because state closures can be tricky in async functions
        // But since we set it in useEffect before this call, it should be fine. 
        // Better yet, let's just re-measure main here to be 100% physically accurate at the moment of consumption.
        const targetX = window.innerWidth / 2;
        const targetY = window.innerHeight / 2;

        // Animate background and stars
        setTimeout(async () => {
            if (!scope.current) return;

            // Animate background to black
            animate(scope.current, { backgroundColor: '#000000' }, { duration: 2 });

            // Fade in stars
            animate(".star-field", { opacity: 1 }, { duration: 3 });

            // Animate all clones - UNIFIED SWARM
            // Everything happens roughly at the same time now
            const animations = elements.map((item, i) => {
                const elementId = `#${item.id}`;
                const isPriority = item.originalElement.hasAttribute('data-singularity-target');

                // Calculate start and end offsets
                const startX = 0;
                const startY = 0;
                const endX = targetX - item.rect.left - (item.rect.width / 2);
                const endY = targetY - item.rect.top - (item.rect.height / 2);

                // Default linear/swirl path
                const animationProps: any = {
                    x: endX,
                    y: endY,
                    scale: 0,
                    rotate: isPriority ? 1440 : 1080,
                    opacity: 0
                };

                // For Friends/Priority items, add chaotic curve
                if (isPriority) {
                    // Create a random control point for a quadratic bezier-like curve 
                    // (But simulated via keyframes since 'animate' handles arrays as keyframes)

                    // Random deviation intensity (bigger = wider curve)
                    const deviation = 300;
                    const dirX = Math.random() > 0.5 ? 1 : -1;
                    const dirY = Math.random() > 0.5 ? 1 : -1;

                    const midX = endX / 2 + (Math.random() * deviation * dirX);
                    const midY = endY / 2 + (Math.random() * deviation * dirY);

                    // Keyframes: Start -> Mid (Deviation) -> End (Void)
                    animationProps.x = [startX, midX, endX];
                    animationProps.y = [startY, midY, endY];
                }

                return animate(elementId, animationProps, {
                    duration: 8,
                    ease: "easeInOut", // Start slow, speed up to hole
                    delay: i * 0.02 // Unified swarm timing
                });
            });

            await Promise.all(animations);
            setPhase('void');
        }, 100);
    };

    // 3. BIG BANG (Restore) - INSTANT RESET
    const triggerBigBang = async () => {
        setPhase('bigbang');

        // 1. Instant White Flash (The "Pop")
        await animate(scope.current, { backgroundColor: '#FFFFFF' }, { duration: 0.1 });

        // 2. Immediate Restoration (No slow animations)
        clones.forEach(c => {
            c.originalElement.style.opacity = '1';
            c.originalElement.style.pointerEvents = 'auto';
        });

        // 3. Close Overlay Immediately
        setClones([]);
        setNuclearSingularity(false);
        setPhase('idle');
    };

    if (!isNuclearSingularity) return null;

    return (
        <div
            ref={scope}
            data-nova-overlay
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                width: '100vw', height: '100vh',
                zIndex: 9990,
                pointerEvents: phase === 'void' ? 'auto' : 'none',
            }}
        >
            {/* 0. Starfield Background */}
            <motion.div
                className="star-field"
                initial={{ opacity: 0 }}
                style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at center, #0a0a1a 0%, #000 100%)',
                    zIndex: -1,
                    pointerEvents: 'none',
                    overflow: 'hidden'
                }}
            >
                {/* Generate 150 stars */}
                {Array.from({ length: 150 }).map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            opacity: [0.2, 0.8, 0.2],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            duration: 2 + Math.random() * 3,
                            repeat: Infinity,
                            delay: Math.random() * 5
                        }}
                        style={{
                            position: 'absolute',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: Math.random() * 3,
                            height: Math.random() * 3,
                            backgroundColor: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 0 5px #fff',
                        }}
                    />
                ))}
            </motion.div>

            {/* The Clones Layer */}
            {clones.map((item) => (
                <div
                    key={item.id}
                    id={item.id}
                    dangerouslySetInnerHTML={{ __html: item.clone.innerHTML }}
                    className={item.originalElement.className}
                    style={{
                        position: 'absolute',
                        top: item.rect.top,
                        left: item.rect.left,
                        width: item.rect.width,
                        height: item.rect.height,
                    }}
                />
            ))}

            {/* The Massive Black Hole */}
            <motion.div
                initial={{
                    top: '50%', left: '50%', x: '-50%', y: '-50%', width: 64, height: 64
                }}
                animate={{
                    top: '50%',
                    left: '50%',
                    x: '-50%',
                    y: '-50%',
                    width: 300,
                    height: 300
                }}
                transition={{ duration: 2, ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    zIndex: 10000,
                    cursor: phase === 'void' ? 'pointer' : 'default',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
                onClick={() => phase === 'void' && triggerBigBang()}
            >
                <div style={{ transform: 'scale(6)' }}>
                    <NovaBlackHole layoutId={undefined} />
                </div>
            </motion.div>

            {/* Click instruction */}
            {phase === 'void' && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ position: 'absolute', bottom: 50, width: '100%', textAlign: 'center', color: '#fff', fontSize: 24, fontFamily: 'monospace' }}
                >
                    [ CLICK THE SINGULARITY TO RESET UNIVERSE ]
                </motion.div>
            )}
        </div>
    );
}
