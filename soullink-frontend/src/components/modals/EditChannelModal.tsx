"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Hash, Loader2 } from "lucide-react";
import styles from "./CreateChannelModal.module.css";
import api from "@/lib/api";

interface EditChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverId: string;
    channel: any;
    onChannelUpdated: (updatedChannel: any) => void;
}

export function EditChannelModal({ isOpen, onClose, serverId, channel, onChannelUpdated }: EditChannelModalProps) {
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [targetChannel, setTargetChannel] = useState<any>(null);

    useEffect(() => {
        if (isOpen && channel && !targetChannel) {
            setTargetChannel(channel);
            setName(channel.name);
        } else if (!isOpen) {
            setTargetChannel(null);
        }
    }, [isOpen, channel, targetChannel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim() || !targetChannel) return;

        if (name === targetChannel.name) {
            onClose();
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            
            const response = await api.patch(`/communities/${serverId}/channels/${targetChannel.id}`, {
                name: name.trim().toLowerCase().replace(/\s+/g, "-"),
            });
            
            if (response.data?.data?.channel) {
                onChannelUpdated(response.data.data.channel);
            }
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to update channel");
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
                            <h2>Edit Channel</h2>
                            <p>Change the name of this channel</p>
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
                                    placeholder="new-channel-name"
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
                                <button
                                    type="submit"
                                    className={styles.createBtn}
                                    style={{ background: '#6C63FF' }}
                                    disabled={isSubmitting || !name.trim() || name === targetChannel?.name}
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
