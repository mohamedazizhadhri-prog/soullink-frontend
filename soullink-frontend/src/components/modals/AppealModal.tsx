"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Scale, AlertTriangle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./AppealModal.module.css";
import api from "@/lib/api";

export interface AppealModalProps {
    reportId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AppealModal({ reportId, onClose, onSuccess }: AppealModalProps) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (reason.length < 20) return;
        setLoading(true);
        setError(null);
        try {
            await api.post("/moderation/appeals", { reportId, reason });
            setSuccess(true);
            if (onSuccess) {
                setTimeout(onSuccess, 3000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit appeal.");
        } finally {
            setLoading(false);
        }
    };

    if (typeof window === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            <div className={styles.overlay} onClick={onClose}>
                <motion.div
                    className={styles.modal}
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                >
                    <div className={styles.header}>
                        <h2 className={styles.title}>
                            <Scale size={20} style={{ color: "#7b68ee" }} />
                            Submit Appeal
                        </h2>
                        <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                    </div>

                    <div className={styles.body}>
                        {success ? (
                            <div className={styles.successState}>
                                <div className={styles.successIcon}>⚖️</div>
                                <h3 className={styles.successTitle}>Appeal Submitted</h3>
                                <p className={styles.successDesc}>
                                    Your appeal has been securely transmitted. A senior moderator will review your case shortly.
                                </p>
                                <button className={styles.doneBtn} onClick={onClose}>Understood</button>
                            </div>
                        ) : (
                            <>
                                <div className={styles.infoBox}>
                                    <strong>Important:</strong> You are submitting an appeal for an action taken against your account.
                                    Provide any context or evidence that proves you did not violate the SoulLink Community Guidelines.
                                </div>

                                <span className={styles.label}>Your Appeal Reason</span>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Explain why you believe the moderation action was incorrect..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    maxLength={3000}
                                />
                                <div className={styles.charCount}>
                                    {reason.length < 20 && reason.length > 0
                                        ? `${20 - reason.length} more characters needed`
                                        : `${reason.length} / 3000`}
                                </div>

                                {error && (
                                    <div style={{ marginTop: 16, padding: 12, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: 10, color: "#ff4757", fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                                        <AlertTriangle size={16} /> {error}
                                    </div>
                                )}

                                <div className={styles.actions}>
                                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                                    <button
                                        className={styles.submitBtn}
                                        onClick={handleSubmit}
                                        disabled={reason.length < 20 || loading}
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : "Submit Appeal"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
