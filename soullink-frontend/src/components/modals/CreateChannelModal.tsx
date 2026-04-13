"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Loader2 } from "lucide-react";
import styles from "./CreateChannelModal.module.css";
import api from "@/lib/api";

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    onChannelCreated: (channel: any) => void;
}

export function CreateChannelModal({ isOpen, onClose, serverId, onChannelCreated }: CreateChannelModalProps) {
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);
            const response = await api.post(`/communities/${serverId}/channels`, {
                name: name.trim(),
            });
            onChannelCreated(response.data.data.channel);
            setName("");
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create channel");
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
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className={styles.header}>
                            <h2>Create Channel</h2>
                            <p>Add a new text channel to your community</p>
                            <button onClick={onClose} className={styles.closeBtn}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.inputGroup}>
                                <label>Channel Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="new-channel"
                                    required
                                    autoFocus
                                />
                                <span className={styles.hashPrefix}>
                                    <Hash size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {name ? name.toLowerCase().replace(/\s+/g, "-") : "channel-name"}
                                </span>
                            </div>

                            {error && <div className={styles.errorMsg}>{error}</div>}

                            <div className={styles.footer}>
                                <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
                                <button type="submit" className={styles.createBtn} disabled={isSubmitting || !name.trim()}>
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Create Channel"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
