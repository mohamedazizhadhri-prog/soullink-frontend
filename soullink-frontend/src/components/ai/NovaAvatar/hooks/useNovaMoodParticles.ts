import { useState, useEffect } from 'react';
import { NovaMood } from '@/types/nova.types';

interface MoodParticlesProps {
    mood: NovaMood;
    isMelting: boolean;
    isSauronMode: boolean;
    ashIntensity: number;
    isSmart: boolean;
}

export function useNovaMoodParticles({
    mood,
    isMelting,
    isSauronMode,
    ashIntensity,
    isSmart
}: MoodParticlesProps) {
    // Sad state logic - Digital Rain
    const [pixels, setPixels] = useState<{ id: number; x: number; delay: number }[]>([]);
    // Disgusted state logic - Green Fumes
    const [bubbles, setBubbles] = useState<{ id: number; x: number; delay: number }[]>([]);
    // Love state logic - Floating Hearts
    const [loveHearts, setLoveHearts] = useState<{ id: number; x: number; delay: number; scale: number; sway: number }[]>([]);

    // Berserker Ash Logic
    const [ashParticles, setAshParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number }[]>([]);

    useEffect(() => {
        if (mood !== 'angry') {
            if (ashParticles.length > 0) setAshParticles([]);
            return;
        }

        const interval = setInterval(() => {
            setAshParticles(prev => {
                const newAsh = {
                    id: Math.random(),
                    x: (Math.random() - 0.5) * 40,
                    y: 20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 5 + 2
                };
                return [...prev.slice(-20), newAsh];
            });
        }, 150);

        return () => clearInterval(interval);
    }, [mood, ashParticles.length]);

    useEffect(() => {
        if (mood === 'sad') {
            const interval = setInterval(() => {
                setPixels(prev => [
                    ...prev.slice(-30),
                    { id: Date.now() + Math.random(), x: Math.random() * 80 - 40, delay: Math.random() * 0.4 }
                ]);
            }, 100);
            return () => clearInterval(interval);
        } else if (mood === 'disgusted') {
            const interval = setInterval(() => {
                setBubbles(prev => [
                    ...prev.slice(-10),
                    { id: Date.now() + Math.random(), x: Math.random() * 30 - 15, delay: Math.random() * 1 }
                ]);
            }, 800);
            return () => clearInterval(interval);
        } else if (mood === 'love') {
            const interval = setInterval(() => {
                setLoveHearts(prev => [
                    ...prev.slice(-15),
                    {
                        id: Date.now() + Math.random(),
                        x: (Math.random() - 0.5) * 40,
                        delay: Math.random() * 0.5,
                        scale: 0.5 + Math.random() * 0.5,
                        sway: (Math.random() - 0.5) * 40
                    }
                ]);
            }, 600);
            return () => clearInterval(interval);
        } else {
            setPixels([]);
            setBubbles([]);
            setLoveHearts([]);
        }
    }, [mood]);

    // Melting Transition & Embers Logic
    const [embers, setEmbers] = useState<{ id: number; x: number; y: number; vx: number; vy: number; scale: number; opacity: number }[]>([]);
    const [meltingIntensity, setMeltingIntensity] = useState(0);

    useEffect(() => {
        if (isMelting) {
            const intensityTimer = setInterval(() => {
                setMeltingIntensity(prev => Math.min(prev + 0.05, 1));
            }, 150);

            const emberInterval = setInterval(() => {
                setEmbers(prev => {
                    const newEmber = {
                        id: Math.random(),
                        x: (Math.random() - 0.5) * 50,
                        y: 20,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -2 - Math.random() * 3,
                        scale: 0.5 + Math.random() * 0.8,
                        opacity: 1
                    };
                    return [...prev.slice(-30), newEmber];
                });
            }, 100);

            return () => {
                clearInterval(intensityTimer);
                clearInterval(emberInterval);
            };
        } else {
            setMeltingIntensity(0);
            setEmbers([]);
        }
    }, [isMelting]);

    // Update Embers Position (Wobble rising)
    useEffect(() => {
        if (embers.length === 0) return;
        const timer = setInterval(() => {
            setEmbers(prev => prev.map(e => ({
                ...e,
                x: e.x + e.vx + Math.sin(Date.now() / 200) * 1.5,
                y: e.y + e.vy,
                opacity: e.opacity - 0.02
            })).filter(e => e.opacity > 0));
        }, 16);
        return () => clearInterval(timer);
    }, [embers.length]);

    // Money Particles Logic (Rich Mode)
    const [moneyParticles, setMoneyParticles] = useState<{ id: number; x: number; y: number; type: 'bill' | 'coin'; rotation: number; vx: number; vy: number }[]>([]);

    useEffect(() => {
        if (mood === 'rich') {
            const interval = setInterval(() => {
                setMoneyParticles(prev => [
                    ...prev.slice(-30),
                    {
                        id: Date.now() + Math.random(),
                        x: (Math.random() - 0.5) * 60,
                        y: -50,
                        type: Math.random() > 0.7 ? 'coin' : 'bill',
                        rotation: Math.random() * 360,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 2 + 2
                    }
                ]);
            }, 200);
            return () => clearInterval(interval);
        } else {
            setMoneyParticles([]);
        }
    }, [mood]);

    // Update Money Particles Position
    useEffect(() => {
        if (moneyParticles.length === 0) return;
        const timer = setInterval(() => {
            setMoneyParticles(prev => prev.map(p => {
                let newY = p.y + p.vy;
                let newVy = p.vy;
                if (p.type === 'coin' && newY > 40) {
                    newY = 40;
                    newVy = -newVy * 0.6;
                }
                return {
                    ...p,
                    x: p.x + p.vx + (p.type === 'bill' ? Math.sin(Date.now() / 200) * 0.5 : 0),
                    y: newY,
                    vy: p.type === 'coin' ? newVy + 0.5 : newVy,
                    rotation: p.rotation + (p.type === 'bill' ? 2 : 5)
                };
            }).filter(p => p.y < 100));
        }, 30);
        return () => clearInterval(timer);
    }, [moneyParticles.length]);

    // Sauron Mode Particles
    const [sauronAsh, setSauronAsh] = useState<{ id: number; x: number; y: number; delay: number; vx: number; vy: number }[]>([]);
    const [sauronEmbers, setSauronEmbers] = useState<{ id: number; x: number; y: number; delay: number; vx: number; vy: number; scale: number }[]>([]);

    useEffect(() => {
        if (!isSauronMode) {
            setSauronAsh([]);
            setSauronEmbers([]);
            return;
        }

        const particleInterval = setInterval(() => {
            setSauronAsh(prev => [
                ...prev.slice(-(ashIntensity / 2)),
                {
                    id: Date.now() + Math.random(),
                    x: (Math.random() - 0.5) * 100,
                    y: -50,
                    delay: Math.random() * 0.5,
                    vx: (Math.random() - 0.5) * 1,
                    vy: Math.random() * 1.5 + 1
                }
            ]);

            if (Math.random() > 0.8) {
                setSauronEmbers(prev => [
                    ...prev.slice(-10),
                    {
                        id: Date.now() + Math.random(),
                        x: (Math.random() - 0.5) * 60,
                        y: 30,
                        delay: Math.random() * 0.2,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -Math.random() * 3 - 2,
                        scale: Math.random() * 0.5 + 0.5
                    }
                ]);
            }
        }, Math.max(20, 200 - ashIntensity * 1.5));

        const movementInterval = setInterval(() => {
            setSauronAsh(prev => prev.map(a => ({
                ...a,
                x: a.x + a.vx + Math.sin(Date.now() / 500) * 0.2,
                y: a.y + a.vy
            })).filter(a => a.y < 200));

            setSauronEmbers(prev => prev.map(e => ({
                ...e,
                x: e.x + e.vx + Math.cos(Date.now() / 300) * 0.5,
                y: e.y + e.vy
            })).filter(e => e.y > -200));
        }, 30);

        return () => {
            clearInterval(particleInterval);
            clearInterval(movementInterval);
        };
    }, [isSauronMode, ashIntensity]);

    // Smart Mode Binary Particles Logic
    const [binaryBits, setBinaryBits] = useState<{ id: number; x: number; y: number; char: string; delay: number }[]>([]);

    useEffect(() => {
        if (isSmart) {
            const interval = setInterval(() => {
                setBinaryBits(prev => [
                    ...prev.slice(-20),
                    {
                        id: Date.now() + Math.random(),
                        x: (Math.random() - 0.5) * 60,
                        y: -30,
                        char: Math.random() > 0.5 ? '0' : '1',
                        delay: Math.random() * 0.3
                    }
                ]);
            }, 150);
            return () => clearInterval(interval);
        } else {
            setBinaryBits([]);
        }
    }, [isSmart]);

    return {
        pixels,
        bubbles,
        loveHearts,
        embers,
        meltingIntensity,
        moneyParticles,
        sauronAsh,
        sauronEmbers,
        binaryBits,
        ashParticles
    };
}
