"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Globe, Lock, Loader2, Plus, Image as ImageIcon, Shield } from 'lucide-react';
import styles from './CreateCommunityModal.module.css';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface CreateCommunityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('isPublic', String(isPublic));
            if (selectedFile) {
                formData.append('icon', selectedFile);
            }

            const response = await api.post('/communities', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const newCommunity = response.data.data.server;
            onClose();
            router.push(`/server/${newCommunity.id}`);
            router.refresh();
        } catch (err: any) {
            console.error('Failed to create community:', err);
            setError(err.response?.data?.message || 'Failed to create community. Please check your image format and try again.');
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
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerIcon}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                >
                                    <Shield size={32} color="#818cf8" />
                                </motion.div>
                            </div>
                            <h2>Create Community</h2>
                            <p>Bring your people together. Customize your space with a unique identity.</p>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.avatarSection}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <motion.div 
                                    className={styles.avatarWrapper} 
                                    onClick={() => fileInputRef.current?.click()}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <div className={styles.avatarPlaceholder}>
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                                        ) : (
                                            <>
                                                <Camera size={32} />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Upload Icon</span>
                                            </>
                                        )}
                                    </div>
                                    <div className={styles.uploadIconOverlay}>
                                        <Plus size={16} />
                                    </div>
                                </motion.div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Community Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. The Soul Cafe"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this community about? Share the vibe..."
                                    rows={3}
                                />
                            </div>

                            <div className={styles.sectionTitle}>Privacy Settings</div>
                            <div className={styles.privacyToggle}>
                                <motion.div
                                    className={`${styles.privacyOption} ${isPublic ? styles.active : ''}`}
                                    onClick={() => setIsPublic(true)}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Globe size={24} />
                                    <div className={styles.privacyText}>
                                        <span className={styles.privacyTitle}>Public</span>
                                        <span className={styles.privacyDesc}>Visible to everyone. Discoverable.</span>
                                    </div>
                                </motion.div>
                                <motion.div
                                    className={`${styles.privacyOption} ${!isPublic ? styles.active : ''}`}
                                    onClick={() => setIsPublic(false)}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Lock size={24} />
                                    <div className={styles.privacyText}>
                                        <span className={styles.privacyTitle}>Private</span>
                                        <span className={styles.privacyDesc}>Invite only. Secure and exclusive.</span>
                                    </div>
                                </motion.div>
                            </div>

                            {error && <div className={styles.errorMsg}>{error}</div>}

                            <div className={styles.footer}>
                                <button type="button" onClick={onClose} className={styles.backBtn}>Cancel</button>
                                <motion.button 
                                    type="submit" 
                                    className={styles.createBtn} 
                                    disabled={isSubmitting}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className={styles.spin} size={20} />
                                    ) : (
                                        <>
                                            <span>Create Community</span>
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
