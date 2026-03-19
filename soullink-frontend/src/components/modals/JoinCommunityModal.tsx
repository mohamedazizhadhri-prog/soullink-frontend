"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hash, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import styles from './JoinCommunityModal.module.css';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface JoinCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function JoinCommunityModal({ isOpen, onClose }: JoinCommunityModalProps) {
    const router = useRouter();
    const [inviteCode, setInviteCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);
            const response = await api.post('/communities/join', {
                inviteCode: inviteCode.trim()
            });

            const community = response.data.data.community;
            onClose();
            router.push(`/server/${community.id}`);
            router.refresh();
        } catch (err: any) {
            console.error('Failed to join community:', err);
            setError(err.response?.data?.message || 'Invalid invite code or already joined');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className={styles.modal}
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    >
                        <div className={styles.header}>
                            <h2>Join a Community</h2>
                            <p>Enter an invite code to join an existing community.</p>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label>INVITE CODE</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value)}
                                        placeholder="e.g. SL-ABC123"
                                        required
                                        autoFocus
                                    />
                                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !inviteCode}>
                                        {isSubmitting ? <Loader2 className={styles.spin} size={20} /> : <ArrowRight size={20} />}
                                    </button>
                                </div>
                                <p className={styles.hint}>Invite codes look like SL-XXXXXX</p>
                            </div>

                            {error && (
                                <div className={styles.errorSection}>
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className={styles.exampleSection}>
                                <h4>DON'T HAVE AN INVITE?</h4>
                                <p>Check out the Discover page to find public communities!</p>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
