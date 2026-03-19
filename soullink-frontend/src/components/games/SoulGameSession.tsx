"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import styles from './SoulGameSession.module.css';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useNovaDispatch } from '@/context/NovaContext';

interface Choice {
    id: string;
    text: string;
    icon: string | null;
    themeColor: string;
    reflectionPrompt: string;
    orderIndex: number;
}

interface Scene {
    id: string;
    sceneOrder: number;
    text: string;
    bgImageUrl: string | null;
    novaComment: string;
    novaMood: string;
    choices: Choice[];
    answeredChoiceId: string | null;
}

interface Game {
    id: string;
    slug: string;
    title: string;
    description: string;
    color: string;
    icon: string;
    episode: number;
    scenes: Scene[];
}

interface Props {
    gameId: string;
}

export function SoulGameSession({ gameId }: Props) {
    const router = useRouter();
    const { addMessage, setMood } = useNovaDispatch();
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
    const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [showNextPrompt, setShowNextPrompt] = useState(false);
    const sceneStartTime = useRef<number>(Date.now());

    useEffect(() => {
        fetchGame();
    }, [gameId]);

    const fetchGame = async () => {
        try {
            const res = await api.get(`/soulgames/${gameId}`);
            const gameData: Game = res.data.data.game;
            setGame(gameData);

            // Resume from where the user left off
            const firstUnanswered = gameData.scenes.findIndex(s => !s.answeredChoiceId);
            if (firstUnanswered >= 0) {
                setCurrentSceneIdx(firstUnanswered);
            } else {
                // All answered — go to last scene
                setCurrentSceneIdx(gameData.scenes.length - 1);
            }
        } catch (err) {
            console.error('Failed to fetch game:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset choice & timer when scene changes
        if (game) {
            const scene = game.scenes[currentSceneIdx];
            setSelectedChoiceId(scene?.answeredChoiceId || null);
            setShowNextPrompt(!!scene?.answeredChoiceId);
            sceneStartTime.current = Date.now();

            // REAL-TIME TRACKING: Report to backend what scene the user is viewing
            if (scene) {
                api.post(`/soulgames/${game.id}/track-view`, {
                    sceneId: scene.id
                }).catch(err => console.error('Failed to track scene view:', err));
            }
        }
    }, [currentSceneIdx, game]);

    const handleChoice = async (choiceId: string) => {
        if (!game) return;
        setSelectedChoiceId(choiceId);
        setIsSubmitting(true);

        const responseTimeMs = Date.now() - sceneStartTime.current;
        const scene = game.scenes[currentSceneIdx];
        const selectedChoice = scene.choices.find(c => c.id === choiceId);

        try {
            // Submit the response to the game
            await api.post(`/soulgames/${game.id}/respond`, {
                sceneId: scene.id,
                choiceId,
                responseTimeMs,
            });

            // Mark as answered locally
            setGame(prev => {
                if (!prev) return prev;
                const updated = { ...prev };
                updated.scenes = [...updated.scenes];
                updated.scenes[currentSceneIdx] = { ...updated.scenes[currentSceneIdx], answeredChoiceId: choiceId };
                return updated;
            });

            // Fetch real-time AI-generated Nova comment (handled by sidebar context)
            if (selectedChoice) {
                api.post('/ai/game-comment', {
                    sceneText: scene.text,
                    choiceText: selectedChoice.text,
                    responseTimeMs,
                    gameTitle: game.title,
                }).then(res => {
                    const data = res.data.data;
                    if (!data.skip && data.comment) {
                        addMessage(data.comment, 'nova');
                        if (data.mood) setMood(data.mood);
                    }
                }).catch(err => console.error('Nova comment error:', err));
            }

            // AUTO-ADVANCE: Move to next question after a brief delay for visual feedback
            setTimeout(() => {
                if (currentSceneIdx < game.scenes.length - 1) {
                    setCurrentSceneIdx(prev => prev + 1);
                    setSelectedChoiceId(null);
                    setShowNextPrompt(false);
                } else {
                    // Last scene reached
                    setShowNextPrompt(true);
                }
            }, 800);

        } catch (err) {
            console.error('Failed to submit response:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (!game) return;
        if (currentSceneIdx < game.scenes.length - 1) {
            setCurrentSceneIdx(prev => prev + 1);
            setSelectedChoiceId(null);
            setShowNextPrompt(false);
        }
    };

    const handleComplete = async () => {
        if (!game) return;
        setIsCompleting(true);
        try {
            const res = await api.post(`/soulgames/${game.id}/complete`);
            const profile = res.data.data.profile;
            // Navigate to results page
            router.push(`/games/${game.id}/results`);
        } catch (err: any) {
            console.error('Failed to complete game:', err);
            alert(err?.response?.data?.message || 'Failed to complete. Please answer all questions.');
        } finally {
            setIsCompleting(false);
        }
    };

    if (loading || !game) {
        return (
            <div className={styles.sessionContainer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={40} className={styles.spinner} />
            </div>
        );
    }

    const currentScene = game.scenes[currentSceneIdx];
    const progress = ((currentSceneIdx + 1) / game.scenes.length) * 100;
    const isLastScene = currentSceneIdx === game.scenes.length - 1;
    const allAnswered = game.scenes.every(s => s.answeredChoiceId);

    return (
        <div className={styles.sessionContainer}>
            {/* Top bar with progress */}
            <div className={styles.topBar}>
                <button className={styles.navBtn} onClick={() => router.push('/games')}>
                    <ChevronLeft size={18} /> Back
                </button>
                <div className={styles.progressContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4, opacity: 0.8 }}>
                        <span>{game.icon} {game.title}</span>
                        <span>{currentSceneIdx + 1} / {game.scenes.length}</span>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${progress}%`, backgroundColor: game.color }} />
                    </div>
                </div>
                <div style={{ width: 80 }} />
            </div>

            {/* Scene area */}
            <main className={styles.sceneArea}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentScene.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className={styles.narrative}
                    >
                        <div className={styles.sceneNumber}>Scene {currentScene.sceneOrder}</div>
                        <p className={styles.narrativeText}>{currentScene.text}</p>
                    </motion.div>
                </AnimatePresence>

                {/* Choices */}
                <div className={styles.choicesGrid}>
                    {currentScene.choices.map((choice) => (
                        <motion.button
                            key={choice.id}
                            className={styles.choiceBtn}
                            onClick={() => handleChoice(choice.id)}
                            disabled={!!selectedChoiceId && selectedChoiceId !== choice.id}
                            whileTap={{ scale: 0.97 }}
                            animate={{
                                scale: selectedChoiceId === choice.id ? 1.02 : 1,
                                opacity: selectedChoiceId && selectedChoiceId !== choice.id ? 0.4 : 1,
                            }}
                            style={{
                                borderColor: selectedChoiceId === choice.id ? game.color : 'rgba(255,255,255,0.1)',
                                boxShadow: selectedChoiceId === choice.id ? `0 0 20px ${game.color}44` : 'none',
                            }}
                        >
                            <span>{choice.text}</span>
                            {selectedChoiceId === choice.id && <CheckCircle2 size={16} style={{ color: game.color }} />}
                        </motion.button>
                    ))}
                </div>
            </main>

            {/* Finish/Navigation bar (only shows at the end or if we need to force progress) */}
            <AnimatePresence>
                {showNextPrompt && (
                    <motion.footer
                        className={styles.reflectionArea}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                    >
                        {/* Finished state placeholder or spacer if needed */}

                        <div className={styles.navButtons}>
                            {!isLastScene ? (
                                <motion.button
                                    className={styles.nextBtn}
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                    style={{ backgroundColor: game.color }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isSubmitting ? <Loader2 size={18} className={styles.spinner} /> : 'Next Scene →'}
                                </motion.button>
                            ) : (
                                <motion.button
                                    className={styles.nextBtn}
                                    onClick={handleComplete}
                                    disabled={isCompleting || !allAnswered}
                                    style={{ backgroundColor: '#10B981', width: '100%', maxWidth: '400px' }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isCompleting ? <Loader2 size={18} className={styles.spinner} /> : '✨ Complete Episode & See Results'}
                                </motion.button>
                            )}
                        </div>
                    </motion.footer>
                )}
            </AnimatePresence>
        </div>
    );
}
