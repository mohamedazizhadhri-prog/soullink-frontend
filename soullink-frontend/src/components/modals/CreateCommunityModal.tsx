"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Globe, Lock, Loader2, Shield } from 'lucide-react';
import styles from './CreateCommunityModal.module.css';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface CreateCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);
            const response = await api.post('/communities', {
                name,
                description,
                isPublic
            });

            const newCommunity = response.data.data.community;
            onClose();
            router.push(`/server/${newCommunity.id}`);
            router.refresh();
        } catch (err: any) {
            console.error('Failed to create community:', err);
            setError(err.response?.data?.message || 'Failed to create community');
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
                            <h2>Create a Community</h2>
                            <p>Give your community a personality with a name and a description.</p>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.avatarSection}>
                                <div className={styles.avatarPlaceholder}>
                                    <Camera size={32} />
                                    <span>Upload Icon</span>
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>COMMUNITY NAME</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="The Cozy Corner"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>DESCRIPTION</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What is this space about?"
                                    rows={3}
                                />
                            </div>

                            <div className={styles.privacyToggle}>
                                <div
                                    className={`${styles.privacyOption} ${isPublic ? styles.active : ''}`}
                                    onClick={() => setIsPublic(true)}
                                >
                                    <Globe size={20} />
                                    <div className={styles.privacyText}>
                                        <span className={styles.privacyTitle}>Public</span>
                                        <span className={styles.privacyDesc}>Anyone can find and join.</span>
                                    </div>
                                </div>
                                <div
                                    className={`${styles.privacyOption} ${!isPublic ? styles.active : ''}`}
                                    onClick={() => setIsPublic(false)}
                                >
                                    <Lock size={20} />
                                    <div className={styles.privacyText}>
                                        <span className={styles.privacyTitle}>Private</span>
                                        <span className={styles.privacyDesc}>Joinable only via invite link.</span>
                                    </div>
                                </div>
                            </div>

                            {error && <div className={styles.errorMsg}>{error}</div>}

                            <div className={styles.footer}>
                                <button type="button" onClick={onClose} className={styles.backBtn}>Back</button>
                                <button type="submit" className={styles.createBtn} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className={styles.spin} size={20} /> : 'Create Community'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
