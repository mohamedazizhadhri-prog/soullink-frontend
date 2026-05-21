import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, FileText, Image as ImageIcon, Calendar, User, Clock, CheckCircle } from "lucide-react";
import { moderationApi } from "@/lib/adminApi";
import styles from "./ModerationReportDrawer.module.css";

interface ModerationReportDrawerProps {
    reportId: string | null;
    onClose: () => void;
    onActionTaken: () => void;
}

export function ModerationReportDrawer({ reportId, onClose, onActionTaken }: ModerationReportDrawerProps) {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Action Form State
    const [action, setAction] = useState<string>("WARNING");
    const [reason, setReason] = useState("");
    const [durationHours, setDurationHours] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!reportId) return;

        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await moderationApi.getReportDetail(reportId);
                setReport(data);
            } catch (err: any) {
                setError(err.message || "Failed to load report details.");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [reportId]);

    const handleSubmitAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportId || !report) return;

        setIsSubmitting(true);
        try {
            const payload: any = {
                targetId: report.reportedId,
                action,
                reason,
            };

            if ((action === "MUTE" || action === "SUSPENSION") && durationHours) {
                payload.duration = parseInt(durationHours, 10);
            }

            // Create Moderation Action
            await moderationApi.createModAction(reportId, payload);
            
            // Mark report as resolved by the fact that action was added.
            // Action also does auto report status change.

            onActionTaken();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to submit moderation action.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismiss = async () => {
        if (!reportId) return;
        const dismissReason = prompt("Reason for dismissal?");
        if (!dismissReason) return;

        try {
            await moderationApi.dismissReport(reportId, dismissReason);
            onActionTaken();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to dismiss report.");
        }
    };

    if (!reportId) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div 
                    className={styles.drawer}
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className={styles.header}>
                        <div className={styles.headerTitle}>
                            <ShieldAlert size={20} color="#ff4757" />
                            <h2>Report Details</h2>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </header>

                    {loading ? (
                        <div className={styles.loadingState}>Loading report data...</div>
                    ) : error ? (
                        <div className={styles.errorState}>{error}</div>
                    ) : report ? (
                        <div className={styles.content}>
                            
                            {/* Summary Cards */}
                            <div className={styles.summaryGrid}>
                                <div className={styles.infoCard}>
                                    <span className={styles.label}><User size={14} /> Reporter</span>
                                    <span className={styles.value}>{report.reporter?.displayName} (@{report.reporter?.handle})</span>
                                </div>
                                <div className={styles.infoCard}>
                                    <span className={styles.label}><User size={14} color="#ff4757" /> Reported Target</span>
                                    <span className={styles.value}>{report.reported?.displayName} (@{report.reported?.handle})</span>
                                </div>
                                <div className={styles.infoCard}>
                                    <span className={styles.label}><ShieldAlert size={14} /> Category</span>
                                    <span className={styles.value}>{report.category.replace('_', ' ')}</span>
                                </div>
                                <div className={styles.infoCard}>
                                    <span className={styles.label}><Clock size={14} /> Context</span>
                                    <span className={styles.value}>{report.contextType || 'Profile'}</span>
                                </div>
                            </div>

                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}><FileText size={16} /> Description</h3>
                                <div className={styles.textBlock}>
                                    {report.description || "No specific description provided."}
                                </div>
                            </div>

                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}><ImageIcon size={16} /> Attached Evidence ({report.evidence?.length || 0})</h3>
                                {report.evidence && report.evidence.length > 0 ? (
                                    <div className={styles.gallery}>
                                        {report.evidence.map((ev: any) => (
                                            <a key={ev.id} href={ev.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.evidenceItem}>
                                                {ev.fileType.startsWith('image') ? (
                                                    <img src={ev.fileUrl} alt="Evidence" />
                                                ) : (
                                                    <div className={styles.documentEvidence}>
                                                        <FileText size={24} />
                                                        <span>{ev.fileType}</span>
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyEvidence}>No evidence uploaded.</div>
                                )}
                            </div>

                            {/* Action Form */}
                            <div className={styles.actionPanel}>
                                <h3 className={styles.sectionTitle}>Take Moderation Action</h3>
                                {report.status.startsWith('RESOLVED') || report.status === 'DISMISSED' ? (
                                    <div className={styles.resolvedState}>
                                        <CheckCircle size={20} color="#4caf50" />
                                        This report has been {report.status.toLowerCase()}.
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitAction} className={styles.form}>
                                        <div className={styles.inputGroup}>
                                            <label>Action Type</label>
                                            <select value={action} onChange={(e) => setAction(e.target.value)} required>
                                                <option value="WARNING">Warning</option>
                                                <option value="MUTE">Mute</option>
                                                <option value="SUSPENSION">Suspension</option>
                                                <option value="BAN">Ban</option>
                                                <option value="CONTENT_REMOVAL">Content Removal</option>
                                            </select>
                                        </div>

                                        {action === "SUSPENSION" && (
                                            <div className={styles.inputGroup}>
                                                <label>Duration (Hours) - Leave blank for permanent</label>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={durationHours}
                                                    onChange={(e) => setDurationHours(e.target.value)}
                                                    placeholder="e.g., 24"
                                                />
                                            </div>
                                        )}

                                        <div className={styles.inputGroup}>
                                            <label>Reason (visible to user)</label>
                                            <textarea 
                                                required
                                                rows={3}
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder="Explain the violation..."
                                            />
                                        </div>

                                        <div className={styles.actionButtons}>
                                            <button 
                                                type="button" 
                                                className={styles.dismissBtn} 
                                                onClick={handleDismiss}
                                                disabled={isSubmitting}
                                            >
                                                Dismiss Report
                                            </button>
                                            <button 
                                                type="submit" 
                                                className={styles.submitBtn}
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? "Applying..." : "Apply Action"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    ) : null}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
