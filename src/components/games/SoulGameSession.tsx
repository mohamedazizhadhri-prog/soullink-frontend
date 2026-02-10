"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Send, Sparkles } from 'lucide-react';
import styles from './SoulGameSession.module.css';
import { SoulGame } from '@/constants/soulGames';
import { useRouter } from 'next/navigation';
import { useNova } from '@/context/NovaContext';

interface Props {
    game: SoulGame;
}

export function SoulGameSession({ game }: Props) {
    const router = useRouter();
    const { setMood, addMessage } = useNova();
    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
    const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
    const [reflection, setReflection] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentScene = game.scenes[currentSceneIdx];
    const progress = ((currentSceneIdx + 1) / game.scenes.length) * 100;

    useEffect(() => {
        if (currentScene) {
            setMood(currentScene.novaMood as any);
        }
    }, [currentSceneIdx, currentScene, setMood]);

    const handleChoice = (idx: number) => {
        setSelectedChoice(idx);
    };

    const handleNext = () => {
        setIsSubmitting(true);
        // Simulate AI analysis delay
        setTimeout(() => {
            if (currentSceneIdx < game.scenes.length - 1) {
                setCurrentSceneIdx(prev => prev + 1);
                setSelectedChoice(null);
                setReflection("");
            } else {
                // Game Complete!
                localStorage.setItem(`soul-game-${game.id}`, 'true');
                addMessage(`Amazing insight! You've completed ${game.title}.`, 'nova');
                router.push('/games');
            }
            setIsSubmitting(false);
        }, 1000);
    };

    if (!currentScene) return <div>Loading scene...</div>;

    return (
        <div className={styles.sessionContainer}>
            <div className={styles.topBar}>
                <button className={styles.navBtn} onClick={() => router.push('/games')}>
                    <ChevronLeft size={18} /> Hub
                </button>
                <div className={styles.progressContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span>{game.title}</span>
                        <span>{currentSceneIdx + 1} / {game.scenes.length}</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%`, backgroundColor: game.color }} />
                    </div>
                </div>
                <div style={{ width: 80 }} /> {/* Spacer */}
            </div>

            <main className={styles.sceneArea}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentScene.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={styles.narrative}
                    >
                        <p className={styles.narrativeText}>{currentScene.text}</p>
                    </motion.div>
                </AnimatePresence>

                <div className={styles.choicesGrid}>
                    {currentScene.choices.map((choice, idx) => (
                        <motion.button
                            key={idx}
                            className={styles.choiceBtn}
                            onClick={() => handleChoice(idx)}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                boxShadow: selectedChoice === idx ? `0 0 20px ${choice.themeColor}aa` : 'none',
                                borderColor: selectedChoice === idx ? choice.themeColor : 'rgba(255,255,255,0.1)',
                                border: selectedChoice === idx ? `3px solid ${choice.themeColor}` : '2px solid transparent'
                            }}
                        >
                            <span>{choice.text}</span>
                        </motion.button>
                    ))}
                </div>
            </main>

            <AnimatePresence>
                {selectedChoice !== null && (
                    <motion.footer
                        className={styles.reflectionArea}
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                    >
                        <div className={styles.aiChat}>
                            <div className={styles.novaOrbPlaceholder}>
                                {/* Visual representation of Nova - Actual Nova is absolute positioned elsewhere */}
                                <Sparkles color={game.color} />
                            </div>
                            <div className={styles.novaBubble}>
                                <div style={{ color: game.color, fontWeight: 800, fontSize: '0.8rem', marginBottom: 4 }}>NOVA REFLECTION</div>
                                {currentScene.choices[selectedChoice].reflectionPrompt}
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <textarea
                                className={styles.textarea}
                                placeholder="Reflect on your choice..."
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                            />
                            <button
                                className={styles.sendBtn}
                                disabled={!reflection.trim() || isSubmitting}
                                onClick={handleNext}
                            >
                                {isSubmitting ? 'Analyzing...' : <Send size={20} />}
                            </button>
                        </div>
                    </motion.footer>
                )}
            </AnimatePresence>
        </div>
    );
}
