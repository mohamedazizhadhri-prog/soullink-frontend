"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ArrowLeft, Loader2, Calendar, LayoutList, ShieldAlert, Send, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import api from "@/lib/api";
import styles from "./page.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface ModAction {
    id: string;
    action: string;
    reason: string;
    duration: number | null;
    expiresAt: string | null;
    createdAt: string;
}

interface Appeal {
    id: string;
    status: string;
    reason: string;
    createdAt: string;
    reviewedAt: string | null;
}

interface ReceivedReport {
    id: string;
    category: string;
    status: string;
    contextType: string | null;
    createdAt: string;
    resolvedAt: string | null;
    modActions: ModAction[];
    appeal: Appeal | null;
}

interface FiledReport {
    id: string;
    category: string;
    status: string;
    description: string;
    contextType: string | null;
    createdAt: string;
    reported: {
        id: string;
        displayName: string;
        handle: string;
        avatarUrl: string | null;
    };
}

type Tab = "against-me" | "i-filed";

export default function MyReportsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("against-me");

    // Against-me state
    const [receivedReports, setReceivedReports] = useState<ReceivedReport[]>([]);
    const [receivedLoading, setReceivedLoading] = useState(true);

    // I-filed state
    const [filedReports, setFiledReports] = useState<FiledReport[]>([]);
    const [filedLoading, setFiledLoading] = useState(true);

    // Appeal modal
    const [appealingReportId, setAppealingReportId] = useState<string | null>(null);
    const [appealReason, setAppealReason] = useState("");
    const [appealError, setAppealError] = useState<string | null>(null);
    const [appealSubmitting, setAppealSubmitting] = useState(false);
    const [appealSuccess, setAppealSuccess] = useState(false);

    useEffect(() => {
        const fetchReceived = async () => {
            try {
                const res = await api.get("/moderation/my-received-reports");
                setReceivedReports(res.data.data.reports || []);
            } catch (err) {
                console.error("Failed to load received reports", err);
            } finally {
                setReceivedLoading(false);
            }
        };
        fetchReceived();
    }, []);

    useEffect(() => {
        const fetchFiled = async () => {
            try {
                const res = await api.get("/moderation/my-filed-reports");
                setFiledReports(res.data.data.reports || []);
            } catch (err) {
                console.error("Failed to load filed reports", err);
            } finally {
                setFiledLoading(false);
            }
        };
        fetchFiled();
    }, []);

    const handleSubmitAppeal = async () => {
        if (!appealingReportId || appealReason.length < 20) return;
        setAppealSubmitting(true);
        setAppealError(null);
        try {
            await api.post("/moderation/appeals", {
                reportId: appealingReportId,
                reason: appealReason,
            });
            setAppealSuccess(true);
            // Update the local state to reflect the new appeal
            setReceivedReports(prev =>
                prev.map(r =>
                    r.id === appealingReportId
                        ? { ...r, appeal: { id: 'pending', status: 'PENDING', reason: appealReason, createdAt: new Date().toISOString(), reviewedAt: null } }
                        : r
                )
            );
            setTimeout(() => {
                setAppealingReportId(null);
                setAppealReason("");
                setAppealSuccess(false);
            }, 2000);
        } catch (err: any) {
            setAppealError(err.response?.data?.message || err.message || "Failed to submit appeal");
        } finally {
            setAppealSubmitting(false);
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "PENDING": return "Pending Review";
            case "UNDER_REVIEW": return "Under Review";
            case "RESOLVED_WARNING": return "Warning Issued";
            case "RESOLVED_SUSPENSION": return "Suspended";
            case "RESOLVED_BAN": return "Banned";
            case "DISMISSED": return "Dismissed";
            case "APPEALED": return "Appealed";
            default: return status.replace(/_/g, " ");
        }
    };

    const getActionBadgeClass = (action: string) => {
        switch (action) {
            case "WARNING": return styles.actionWarning;
            case "SUSPENSION": return styles.actionSuspension;
            case "BAN": return styles.actionBan;
            case "CONTENT_REMOVAL": return styles.actionRemoval;
            case "UNBAN": return styles.actionUnban;
            default: return "";
        }
    };

    const canAppeal = (report: ReceivedReport) => {
        const appealable = ["RESOLVED_BAN", "RESOLVED_SUSPENSION", "RESOLVED_WARNING"];
        return appealable.includes(report.status) && !report.appeal;
    };

    const getAppealStatusIcon = (status: string) => {
        switch (status) {
            case "PENDING": return <Clock size={14} color="#ffab00" />;
            case "ACCEPTED": return <CheckCircle size={14} color="#4caf50" />;
            case "REJECTED": return <XCircle size={14} color="#ff4757" />;
            default: return null;
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleBox}>
                    <h1>
                        <div style={{ padding: "10px", background: "rgba(255, 71, 87, 0.1)", borderRadius: "14px", display: "flex" }}>
                            <Flag size={28} color="#ff4757" />
                        </div>
                        My Reports
                    </h1>
                    <p>View moderation actions and reports status</p>
                </div>
                <button className={styles.backBtn} onClick={() => router.push("/")}>
                    <ArrowLeft size={18} /> Back to Home
                </button>
            </header>

            {/* Tab Bar */}
            <div className={styles.tabBar}>
                <button
                    className={`${styles.tab} ${activeTab === "against-me" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("against-me")}
                >
                    <ShieldAlert size={16} />
                    Reports Against Me
                    {receivedReports.length > 0 && (
                        <span className={styles.tabBadge}>{receivedReports.length}</span>
                    )}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "i-filed" ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab("i-filed")}
                >
                    <Send size={16} />
                    Reports I Filed
                    {filedReports.length > 0 && (
                        <span className={styles.tabBadge}>{filedReports.length}</span>
                    )}
                </button>
            </div>

            {/* Tab: Reports Against Me */}
            {activeTab === "against-me" && (
                <>
                    {receivedLoading ? (
                        <div className={styles.loading}>
                            <Loader2 size={32} className={styles.spinner} color="#7b68ee" />
                            <p>Loading reports...</p>
                        </div>
                    ) : receivedReports.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>✨</div>
                            <h2>Clean record</h2>
                            <p>No reports have been filed against you. Keep being awesome!</p>
                        </div>
                    ) : (
                        <div className={styles.reportsGrid}>
                            <AnimatePresence>
                                {receivedReports.map((report, idx) => (
                                    <motion.div
                                        key={report.id}
                                        className={styles.reportCard}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <div className={styles.cardHeader}>
                                            <div className={styles.targetInfo}>
                                                <div className={styles.categoryIcon}>
                                                    <ShieldAlert size={20} color="#ff4757" />
                                                </div>
                                                <div className={styles.targetMeta}>
                                                    <h3>{report.category.replace(/_/g, " ")}</h3>
                                                    <span>{report.contextType || "Profile"} report</span>
                                                </div>
                                            </div>
                                            <div className={`${styles.statusBadge} ${styles[report.status] || ""}`}>
                                                {getStatusText(report.status)}
                                            </div>
                                        </div>

                                        <div className={styles.details}>
                                            <div className={styles.metaRow}>
                                                <span><Calendar size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> Filed: {new Date(report.createdAt).toLocaleDateString()}</span>
                                                {report.resolvedAt && (
                                                    <span>Resolved: {new Date(report.resolvedAt).toLocaleDateString()}</span>
                                                )}
                                            </div>

                                            {/* Mod actions taken */}
                                            {report.modActions.length > 0 && (
                                                <div className={styles.actionsSection}>
                                                    <span className={styles.actionsLabel}>Actions taken:</span>
                                                    <div className={styles.actionsList}>
                                                        {report.modActions.map(a => (
                                                            <div key={a.id} className={`${styles.actionChip} ${getActionBadgeClass(a.action)}`}>
                                                                <strong>{a.action.replace(/_/g, " ")}</strong>
                                                                <span className={styles.actionReason}>{a.reason}</span>
                                                                {a.duration && <span className={styles.actionDuration}>{a.duration}h</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Appeal Status */}
                                        {report.appeal && (
                                            <div className={`${styles.appealStatus} ${styles[`appeal_${report.appeal.status}`]}`}>
                                                {getAppealStatusIcon(report.appeal.status)}
                                                <span>Appeal {report.appeal.status.toLowerCase()}</span>
                                                {report.appeal.reviewedAt && (
                                                    <span className={styles.appealDate}>
                                                        {new Date(report.appeal.reviewedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Appeal Button */}
                                        {canAppeal(report) && (
                                            <button
                                                className={styles.appealBtn}
                                                onClick={() => {
                                                    setAppealingReportId(report.id);
                                                    setAppealReason("");
                                                    setAppealError(null);
                                                    setAppealSuccess(false);
                                                }}
                                            >
                                                <AlertTriangle size={16} />
                                                Submit Appeal
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}

            {/* Tab: Reports I Filed */}
            {activeTab === "i-filed" && (
                <>
                    {filedLoading ? (
                        <div className={styles.loading}>
                            <Loader2 size={32} className={styles.spinner} color="#7b68ee" />
                            <p>Loading your reports...</p>
                        </div>
                    ) : filedReports.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>🕊️</div>
                            <h2>No reports filed</h2>
                            <p>You haven't reported any users yet. The SoulLink community remains peaceful.</p>
                        </div>
                    ) : (
                        <div className={styles.reportsGrid}>
                            <AnimatePresence>
                                {filedReports.map((report, idx) => (
                                    <motion.div
                                        key={report.id}
                                        className={styles.reportCard}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <div className={styles.cardHeader}>
                                            <div className={styles.targetInfo}>
                                                {report.reported.avatarUrl ? (
                                                    <img src={report.reported.avatarUrl} alt="" className={styles.avatar} />
                                                ) : (
                                                    <div className={styles.avatar}>{report.reported.displayName[0]}</div>
                                                )}
                                                <div className={styles.targetMeta}>
                                                    <h3>{report.reported.displayName}</h3>
                                                    <span>@{report.reported.handle}</span>
                                                </div>
                                            </div>
                                            <div className={`${styles.statusBadge} ${styles[report.status] || ""}`}>
                                                {getStatusText(report.status)}
                                            </div>
                                        </div>

                                        <div className={styles.details}>
                                            <div className={styles.metaRow}>
                                                <span><Calendar size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> {new Date(report.createdAt).toLocaleDateString()}</span>
                                                <span><LayoutList size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} /> {report.contextType || "Profile"}</span>
                                            </div>
                                            <div className={styles.metaRow}>
                                                <span>Category: <strong>{report.category.replace(/_/g, " ")}</strong></span>
                                            </div>
                                            <p style={{ marginTop: 12, opacity: 0.9 }}>{report.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}

            {/* Appeal Modal */}
            <AnimatePresence>
                {appealingReportId && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !appealSubmitting && setAppealingReportId(null)}
                    >
                        <motion.div
                            className={styles.modalContent}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            {appealSuccess ? (
                                <div className={styles.appealSuccessState}>
                                    <CheckCircle size={48} color="#4caf50" />
                                    <h3>Appeal Submitted</h3>
                                    <p>A moderator will review your appeal shortly. You'll be notified of the outcome.</p>
                                </div>
                            ) : (
                                <>
                                    <h3 className={styles.modalTitle}>
                                        <AlertTriangle size={20} color="#ffab00" />
                                        Submit an Appeal
                                    </h3>
                                    <p className={styles.modalDesc}>
                                        Explain why you believe the moderation action was unjust. Be specific and provide any relevant context. A moderator will review your appeal and notify you of the decision.
                                    </p>

                                    {appealError && (
                                        <div className={styles.modalError}>
                                            <XCircle size={16} />
                                            {appealError}
                                        </div>
                                    )}

                                    <textarea
                                        className={styles.appealTextarea}
                                        rows={5}
                                        placeholder="Explain why you believe this action was unjust (minimum 20 characters)..."
                                        value={appealReason}
                                        onChange={e => setAppealReason(e.target.value)}
                                        disabled={appealSubmitting}
                                    />
                                    <div className={styles.charCount}>
                                        {appealReason.length}/20 minimum
                                    </div>

                                    <div className={styles.modalActions}>
                                        <button
                                            className={styles.modalCancel}
                                            onClick={() => setAppealingReportId(null)}
                                            disabled={appealSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className={styles.modalSubmit}
                                            onClick={handleSubmitAppeal}
                                            disabled={appealSubmitting || appealReason.length < 20}
                                        >
                                            {appealSubmitting ? (
                                                <><Loader2 size={16} className={styles.spinner} /> Submitting...</>
                                            ) : (
                                                <><Send size={16} /> Submit Appeal</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
