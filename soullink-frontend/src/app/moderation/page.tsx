'use client';

/**
 * Moderation Dashboard — /moderation
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6.3
 *
 * Features:
 *  - Tabbed view: Queue | Appeals | My History
 *  - Each row has quick action buttons (assign, action, dismiss)
 */

import { useEffect, useState, useCallback } from 'react';
import { moderationApi } from '@/lib/adminApi';
import ModerationSidebar from '@/components/admin/ModerationSidebar';
import { ModerationReportDrawer } from '@/components/admin/ModerationReportDrawer';
import { ConfirmationModal, InputModal } from '@/components/admin/AdminModal';
import styles from './page.module.css';

const CATEGORY_ICON: Record<string, string> = {
    HARASSMENT: '😤', SPAM: '📧', HATE_SPEECH: '⚡',
    FAKE_ACCOUNT: '🎭', INAPPROPRIATE: '🔞', OTHER: '❓',
};

type Tab = 'queue' | 'appeals' | 'my-actions';

export default function ModerationPage() {
    const [tab,         setTab]         = useState<Tab>('queue');
    const [queueData,   setQueueData]   = useState<any>(null);
    const [appealsData, setAppealsData] = useState<any>(null);
    const [historyData, setHistoryData] = useState<any>(null);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [showUnassigned, setShowUnassigned] = useState(true);

    // Modal state
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', isDanger: false, action: () => {} });
    const [inputModal, setInputModal]     = useState({ isOpen: false, title: '', message: '', isDanger: false, action: (val: string) => {} });


    const loadTab = useCallback(async (t: Tab) => {
        setLoading(true);
        setError(null);
        try {
            if (t === 'queue')      { const d = await moderationApi.getQueue({ unassigned: String(showUnassigned) });     setQueueData(d); }
            if (t === 'appeals')    { const d = await moderationApi.listAppeals();  setAppealsData(d); }
            if (t === 'my-actions') { const d = await moderationApi.getMyActions(); setHistoryData(d); }
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [showUnassigned]);

    useEffect(() => { loadTab(tab); }, [tab, loadTab]);

    const handleAssign = async (reportId: string) => {
        try { await moderationApi.assignReport(reportId); loadTab('queue'); }
        catch (e: any) { alert('Error: ' + e.message); }
    };

    const handleDismiss = (reportId: string) => {
        setInputModal({
            isOpen: true,
            title: 'Dismiss Report',
            message: 'Provide a reason for dismissing this report:',
            isDanger: false,
            action: async (reason: string) => {
                setInputModal(prev => ({ ...prev, isOpen: false }));
                try { await moderationApi.dismissReport(reportId, reason); loadTab('queue'); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const handleAcceptAppeal = (appealId: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Accept Appeal',
            message: `Accept the appeal from ${userName}? Any sanctions against this user will be reversed.`,
            isDanger: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await moderationApi.resolveAppeal(appealId, 'ACCEPTED'); loadTab('appeals'); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const handleRejectAppeal = (appealId: string) => {
        setInputModal({
            isOpen: true,
            title: 'Reject Appeal',
            message: 'Provide a reason for rejecting this appeal:',
            isDanger: true,
            action: async (notes: string) => {
                setInputModal(prev => ({ ...prev, isOpen: false }));
                try { await moderationApi.resolveAppeal(appealId, 'REJECTED', notes); loadTab('appeals'); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const stats = historyData?.stats;

    return (
        <div className={styles.shell}>
            <ModerationSidebar />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.title}>🛡️ Moderation Dashboard</h1>
                    <span className={styles.badge}>MODERATOR</span>
                </header>

                {/* My Stats Bar */}
                {stats && (
                    <div className={styles.statsBar} role="region" aria-label="My moderation stats">
                        {[
                            { label: 'Total Actions', value: stats.total, color: '#7B68EE' },
                            { label: 'This Week',     value: stats.thisWeek,  color: '#00BFFF' },
                            { label: 'Warnings',      value: stats.warnings,  color: '#FFD700' },
                            { label: 'Bans',          value: stats.bans,      color: '#FF4444' },
                            { label: 'Unbans',        value: stats.unbans,    color: '#32CD32' },
                        ].map(s => (
                            <div key={s.label} className={styles.statChip}>
                                <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
                                <span className={styles.statLabel}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <nav className={styles.tabs} role="tablist" aria-label="Moderation sections">
                    {(['queue', 'appeals', 'my-actions'] as Tab[]).map(t => (
                        <button
                            key={t}
                            role="tab"
                            aria-selected={tab === t}
                            className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
                            onClick={() => setTab(t)}
                            id={`tab-${t}`}
                            aria-controls={`panel-${t}`}
                        >
                            {{ queue: '🚩 Queue', appeals: '⚖️ Appeals', 'my-actions': '📋 My History' }[t]}
                        </button>
                    ))}
                </nav>

                {error && <div className={styles.errorBanner} role="alert">⚠️ {error}</div>}

                {/* Tab Panels */}
                <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.panel}>

                    {/* ── Queue ───────────────────────────────────── */}
                    {tab === 'queue' && (
                        <div className={styles.reportList}>
                            
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <button 
                                    className={`${styles.tab} ${showUnassigned ? styles.activeTab : ''}`}
                                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                                    onClick={() => setShowUnassigned(true)}
                                >New (Unassigned)</button>
                                <button 
                                    className={`${styles.tab} ${!showUnassigned ? styles.activeTab : ''}`}
                                    style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                                    onClick={() => setShowUnassigned(false)}
                                >Assigned To Me</button>
                            </div>

                            {loading ? <div className={styles.loadingText}>Loading queue…</div>
                            : !queueData?.reports?.length ? <div className={styles.empty}>🎉 Queue is empty</div>
                            : queueData.reports.map((r: any) => (
                                <article key={r.id} className={styles.reportCard}>
                                    <div className={styles.reportTop}>
                                        <span className={styles.categoryIcon} aria-hidden="true">
                                            {CATEGORY_ICON[r.category] ?? '❓'}
                                        </span>
                                        <div className={styles.reportMeta}>
                                            <span className={styles.reportCategory}>{r.category}</span>
                                            <span className={styles.reportDate}>{new Date(r.createdAt).toLocaleString()}</span>
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles['status' + r.status]}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <div className={styles.reportParties}>
                                        <span>🚩 <strong>{r.reporter?.displayName}</strong> reported <strong>{r.reported?.displayName}</strong></span>
                                    </div>
                                    {r.content && <p className={styles.reportContent}>"{r.content}"</p>}
                                    <div className={styles.reportActions}>
                                        {!r.assignedModId && (
                                            <button
                                                className={styles.primaryBtn}
                                                onClick={() => handleAssign(r.id)}
                                                aria-label={`Assign report ${r.id} to myself`}
                                            >Assign to Me</button>
                                        )}
                                        <button
                                            className={styles.primaryBtn}
                                            onClick={() => setSelectedReportId(r.id)}
                                            style={{ background: '#7b68ee' }}
                                        >Review Details</button>
                                        {!r.assignedModId ? (
                                            <button
                                                className={styles.dangerBtn}
                                                onClick={() => handleDismiss(r.id)}
                                                aria-label={`Dismiss report ${r.id}`}
                                            >Dismiss</button>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* ── Appeals ─────────────────────────────────── */}
                    {tab === 'appeals' && (
                        <div className={styles.reportList}>
                            {loading ? <div className={styles.loadingText}>Loading appeals…</div>
                            : !appealsData?.appeals?.length ? <div className={styles.empty}>No pending appeals</div>
                            : appealsData.appeals.map((a: any) => (
                                <article key={a.id} className={styles.reportCard}>
                                    <div className={styles.reportTop}>
                                        <span className={styles.categoryIcon}>⚖️</span>
                                        <div className={styles.reportMeta}>
                                            <span className={styles.reportCategory}>Appeal by <strong>{a.user?.displayName}</strong></span>
                                            <span className={styles.reportDate}>{new Date(a.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {a.reason && <p className={styles.reportContent} style={{ fontStyle: 'italic' }}>"{a.reason}"</p>}
                                    {a.report && (
                                        <div style={{ fontSize: '0.85rem', marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <div><strong>Original Violation:</strong> {a.report.category.replace(/_/g, ' ')}</div>
                                            {a.report.modActions?.[0] && (
                                                <div style={{ marginTop: '4px', color: '#ffab00' }}>
                                                    <strong>Action Taken:</strong> {a.report.modActions[0].action} - {a.report.modActions[0].reason}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={styles.reportActions}>
                                        <button
                                            className={styles.successBtn}
                                            onClick={() => handleAcceptAppeal(a.id, a.user?.displayName ?? 'this user')}
                                            aria-label={`Accept appeal from ${a.user?.displayName}`}
                                        >✓ Accept</button>
                                        <button
                                            className={styles.dangerBtn}
                                            onClick={() => handleRejectAppeal(a.id)}
                                            aria-label={`Reject appeal from ${a.user?.displayName}`}
                                        >✕ Reject</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* ── My History ──────────────────────────────── */}
                    {tab === 'my-actions' && (
                        <div className={styles.reportList}>
                            {loading ? <div className={styles.loadingText}>Loading history…</div>
                            : !historyData?.actions?.length ? <div className={styles.empty}>No actions yet</div>
                            : historyData.actions.map((a: any) => (
                                <article key={a.id} className={styles.reportCard}>
                                    <div className={styles.reportTop}>
                                        <span className={styles.categoryIcon}>📋</span>
                                        <div className={styles.reportMeta}>
                                            <span className={styles.reportCategory}>{a.action} on <strong>{a.target?.displayName}</strong></span>
                                            <span className={styles.reportDate}>{new Date(a.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <p className={styles.reportContent}>{a.reason}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Evidence & Details Drawer */}
            <ModerationReportDrawer 
                reportId={selectedReportId} 
                onClose={() => setSelectedReportId(null)} 
                onActionTaken={() => {
                    loadTab('queue');
                    loadTab('my-actions');
                }} 
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <InputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                message={inputModal.message}
                inputType="textarea"
                isDanger={inputModal.isDanger}
                onConfirm={inputModal.action}
                onCancel={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
