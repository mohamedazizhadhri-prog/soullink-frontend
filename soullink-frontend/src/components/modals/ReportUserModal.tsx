"use client";

import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Flag, Upload, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ReportUserModal.module.css";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportUserModalProps {
    targetUserId: string;
    targetDisplayName: string;
    contextType?: "DM" | "MATCH" | "COMMUNITY" | "PROFILE";
    contextId?: string;
    onClose: () => void;
}

interface Category {
    value: string;
    icon: string;
    label: string;
    desc: string;
}

// ── Category definitions ───────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
    { value: "HARASSMENT",            icon: "😤", label: "Harassment",           desc: "Threatening, bullying, or abusive messages" },
    { value: "SPAM",                  icon: "📧", label: "Spam",                 desc: "Unsolicited promotions or repeated content" },
    { value: "FAKE_IDENTITY",         icon: "🎭", label: "Fake Identity",        desc: "Impersonating someone or using false info" },
    { value: "INAPPROPRIATE_CONTENT", icon: "🔞", label: "Inappropriate",        desc: "Explicit or adult content without consent" },
    { value: "HATE_SPEECH",           icon: "⚡", label: "Hate Speech",          desc: "Attacking based on identity or beliefs" },
    { value: "UNDERAGE",              icon: "👶", label: "Underage Concern",     desc: "Appears to be under the minimum age" },
    { value: "OTHER",                 icon: "❓", label: "Other",                desc: "Something not covered by other categories" },
];

// ── Main component ─────────────────────────────────────────────────────────────

export function ReportUserModal({
    targetUserId,
    targetDisplayName,
    contextType,
    contextId,
    onClose,
}: ReportUserModalProps) {
    const [step, setStep]             = useState<1 | 2 | 3>(1);
    const [category, setCategory]     = useState<string>("");
    const [description, setDescription] = useState("");
    const [previews, setPreviews]     = useState<{ file: File; url: string }[]>([]);
    const [loading, setLoading]       = useState(false);
    const [reportId, setReportId]     = useState<string | null>(null);
    const [error, setError]           = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload images first, then submit the report
    const handleSubmit = useCallback(async () => {
        if (!category || description.length < 10) return;
        setLoading(true);
        setError(null);
        try {
            // Step 1: Upload evidence files
            const evidenceUrls: { url: string; type: string }[] = [];
            for (const { file } of previews) {
                const fd = new FormData();
                fd.append("file", file);
                const res = await api.post("/uploads/evidence", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                evidenceUrls.push({ url: res.data.data.url, type: "SCREENSHOT" });
            }

            // Step 2: Submit report
            const res = await api.post("/reports", {
                reportedId:  targetUserId,
                category,
                description,
                contextType: contextType ?? null,
                contextId:   contextId ?? null,
                evidenceUrls,
            });

            setReportId(res.data.data.report.id);
            setStep(3); // success
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [category, description, previews, targetUserId, contextType, contextId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        const remaining = 3 - previews.length;
        files.slice(0, remaining).forEach(file => {
            const url = URL.createObjectURL(file);
            setPreviews(prev => [...prev, { file, url }]);
        });
        e.target.value = "";
    };

    const removePreview = (idx: number) => {
        setPreviews(prev => {
            URL.revokeObjectURL(prev[idx].url);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const selectedCat = CATEGORIES.find(c => c.value === category);

    // ── Render step content ──────────────────────────────────────────────────

    const renderStep = () => {
        if (step === 3 && reportId) {
            return (
                <div className={styles.successState}>
                    <div className={styles.successIcon}>✅</div>
                    <h3 className={styles.successTitle}>Report Submitted</h3>
                    <p className={styles.successDesc}>
                        Your report has been received. Our moderation team will review it and take action.
                        Report ID: <strong>#{reportId.slice(-8).toUpperCase()}</strong>
                    </p>
                    <button className={styles.doneBtn} onClick={onClose}>Done</button>
                </div>
            );
        }

        if (step === 1) {
            return (
                <>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginBottom: 16 }}>
                        What's the reason for reporting <strong style={{ color: "#fff" }}>{targetDisplayName}</strong>?
                    </p>
                    <div className={styles.categoryGrid}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                className={`${styles.categoryCard} ${category === cat.value ? styles.selected : ""}`}
                                onClick={() => setCategory(cat.value)}
                            >
                                <span className={styles.categoryIcon}>{cat.icon}</span>
                                <span className={styles.categoryLabel}>{cat.label}</span>
                                <span className={styles.categoryDesc}>{cat.desc}</span>
                            </button>
                        ))}
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.backBtn} onClick={onClose}>Cancel</button>
                        <button
                            className={styles.nextBtn}
                            disabled={!category}
                            onClick={() => setStep(2)}
                        >
                            Next →
                        </button>
                    </div>
                </>
            );
        }

        if (step === 2) {
            return (
                <>
                    <div style={{ marginBottom: 16 }}>
                        <span className={styles.label}>Category</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                            <span>{selectedCat?.icon}</span>
                            <span style={{ fontWeight: 600 }}>{selectedCat?.label}</span>
                        </div>
                    </div>

                    <span className={styles.label}>Description</span>
                    <textarea
                        className={styles.textarea}
                        placeholder="Describe what happened in detail. Be specific about dates, messages, or behaviors..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        maxLength={2000}
                    />
                    <div className={styles.charCount}>
                        {description.length < 10 && description.length > 0
                            ? `${10 - description.length} more characters needed`
                            : `${description.length} / 2000`}
                    </div>

                    <div className={styles.evidenceSection}>
                        <span className={styles.label}>Evidence (optional, max 3 screenshots)</span>

                        {previews.length > 0 && (
                            <div className={styles.evidenceGrid}>
                                {previews.map((p, i) => (
                                    <div key={i} className={styles.evidenceThumb}>
                                        <img src={p.url} alt={`Evidence ${i + 1}`} />
                                        <button className={styles.removeEvidence} onClick={() => removePreview(i)}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {previews.length < 3 && (
                            <div className={styles.dropZone} onClick={() => fileInputRef.current?.click()}>
                                <Upload size={20} style={{ margin: "0 auto 8px", display: "block" }} />
                                Click to upload screenshots
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />
                    </div>

                    {error && (
                        <div style={{ marginTop: 16, padding: 12, background: "rgba(255,71,87,0.1)", borderRadius: 10, color: "#ff4757", fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
                        <button
                            className={styles.nextBtn}
                            disabled={description.length < 10}
                            onClick={() => { setStep(3); }}
                        >
                            Review →
                        </button>
                    </div>
                </>
            );
        }

        // Step 3 = confirmation (when reportId is null, showing summary before submit)
        return (
            <>
                <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Reporting</span>
                        <span className={styles.summaryValue}>{targetDisplayName}</span>
                    </div>
                    <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Category</span>
                        <span className={styles.summaryValue}>{selectedCat?.icon} {selectedCat?.label}</span>
                    </div>
                    {contextType && (
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Context</span>
                            <span className={styles.summaryValue}>{contextType}</span>
                        </div>
                    )}
                    {previews.length > 0 && (
                        <div className={styles.summaryRow}>
                            <span className={styles.summaryLabel}>Evidence</span>
                            <span className={styles.summaryValue}>{previews.length} screenshot{previews.length > 1 ? "s" : ""}</span>
                        </div>
                    )}
                    <div className={styles.summaryDesc}>{description}</div>
                </div>

                {error && (
                    <div style={{ marginTop: 16, padding: 12, background: "rgba(255,71,87,0.1)", borderRadius: 10, color: "#ff4757", fontSize: "0.85rem", display: "flex", gap: 8, alignItems: "center" }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                <div className={styles.actions}>
                    <button className={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Submitting..." : <>🚩 Submit Report</>}
                    </button>
                </div>
            </>
        );
    };

    // ── Portal render ────────────────────────────────────────────────────────

    if (typeof window === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            <div className={styles.overlay} onClick={onClose}>
                <motion.div
                    className={styles.modal}
                    onClick={e => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                    <div className={styles.header}>
                        <h2 className={styles.title}>
                            <Flag size={20} style={{ color: "#ff4757" }} />
                            Report User
                        </h2>
                        <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
                    </div>

                    {step < 3 && (
                        <div style={{ padding: "12px 24px 0" }}>
                            <div className={styles.steps}>
                                {[1, 2, 3].map(s => (
                                    <div
                                        key={s}
                                        className={`${styles.stepDot} ${step === s ? styles.active : step > s ? styles.done : ""}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.body}>
                        {renderStep()}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
