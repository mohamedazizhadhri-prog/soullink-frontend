'use client';

/**
 * Admin Reports Page — /admin/reports
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6.4
 * CDC: EF-071, EF-072
 *
 * Tab 1 "All Reports" — full report list with action badges showing moderator + action type
 * Tab 2 "Moderator Activity" — search any moderator, see their complete action history
 */

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import { InputModal } from '@/components/admin/AdminModal';
import { ModerationReportDrawer } from '@/components/admin/ModerationReportDrawer';
import styles from './reports.module.css';
import {
    Flag,
    ClipboardList,
    Shield,
    AlertTriangle,
    Search,
    Eye,
    Undo2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

// ── Colour maps ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    PENDING:           '#FFD700',
    UNDER_REVIEW:      '#00BFFF',
    RESOLVED_BAN:      '#FF4444',
    RESOLVED_WARNING:  '#20B2AA',
    DISMISSED:         '#808080',
    APPEALED:          '#7B68EE',
};

const ACTION_COLORS: Record<string, string> = {
    WARNING:          '#FFD700',
    MUTE:             '#FF8C00',
    SUSPENSION:       '#FF6B35',
    BAN:              '#FF4444',
    UNBAN:            '#32CD32',
    CONTENT_REMOVAL:  '#9B59B6',
};

type Tab = 'reports' | 'moderator';

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
    const [tab, setTab] = useState<Tab>('reports');

    // ── Reports tab ──────────────────────────────────────────────────────────
    const [reports,   setReports]  = useState<any[]>([]);
    const [total,     setTotal]    = useState(0);
    const [page,      setPage]     = useState(1);
    const [status,    setStatus]   = useState('');
    const [loading,   setLoading]  = useState(true);
    const [error,     setError]    = useState<string | null>(null);

    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [inputModal, setInputModal] = useState({
        isOpen: false, title: '', message: '', isDanger: false,
        action: (_val: string) => {},
    });

    const loadReports = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const data = await adminApi.listReports({ page, limit: 20, ...(status ? { status } : {}) });
            setReports(data.reports ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, status]);

    useEffect(() => { loadReports(); }, [loadReports]);

    const handleReverseAction = (actionId: string, actionType: string) => {
        setInputModal({
            isOpen: true,
            title: 'Reverse Moderation Action',
            message: `Provide a reason for reversing this ${actionType} action. The user's status will be restored.`,
            isDanger: false,
            action: async (reason: string) => {
                setInputModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.reverseModAction(actionId, reason); loadReports(); }
                catch (e: any) { alert('Error: ' + e.message); }
            },
        });
    };

    const pages = Math.ceil(total / 20);

    // ── Moderator Activity tab ───────────────────────────────────────────────
    const [mods,            setMods]           = useState<any[]>([]);
    const [modsLoading,     setModsLoading]    = useState(false);
    const [modSearch,       setModSearch]      = useState('');
    const [selectedMod,     setSelectedMod]    = useState<any | null>(null);
    const [modActions,      setModActions]     = useState<any[]>([]);
    const [modActionsLoading, setModActionsLoading] = useState(false);
    const [modError,        setModError]       = useState<string | null>(null);

    // Load moderators only when switching to that tab for the first time
    useEffect(() => {
        if (tab !== 'moderator' || mods.length > 0) return;
        setModsLoading(true);
        adminApi.listModerators()
            .then((data: any) => setMods(Array.isArray(data) ? data : (data?.moderators ?? [])))
            .catch(() => setModError('Failed to load moderators'))
            .finally(() => setModsLoading(false));
    }, [tab, mods.length]);

    const handleSelectMod = async (mod: any) => {
        setSelectedMod(mod);
        setModActionsLoading(true);
        setModError(null);
        try {
            const actions = await adminApi.getModeratorActions(mod.id);
            setModActions(Array.isArray(actions) ? actions : []);
        } catch {
            setModError('Failed to load actions for this moderator');
            setModActions([]);
        } finally {
            setModActionsLoading(false);
        }
    };

    const filteredMods = mods.filter(m =>
        m.displayName?.toLowerCase().includes(modSearch.toLowerCase()) ||
        m.handle?.toLowerCase().includes(modSearch.toLowerCase())
    );

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className={styles.shell}>
            <AdminSidebar />

            <main className={styles.main}>
                {/* Header */}
                <header className={styles.header}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}><Flag size={20} /></span> Reports
                    </h1>
                    {tab === 'reports' && (
                        <span className={styles.count}>{total.toLocaleString()} total</span>
                    )}
                </header>

                {/* Tab bar */}
                <div className={styles.tabBar}>
                    <button
                        id="tab-all-reports"
                        className={`${styles.tabBtn} ${tab === 'reports' ? styles.tabActive : ''}`}
                        onClick={() => setTab('reports')}
                    >
                        <ClipboardList size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> All Reports
                    </button>
                    <button
                        id="tab-moderator-activity"
                        className={`${styles.tabBtn} ${tab === 'moderator' ? styles.tabActive : ''}`}
                        onClick={() => setTab('moderator')}
                    >
                        <Shield size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Moderator Activity
                    </button>
                </div>

                {/* ── TAB 1 — All Reports ─────────────────────────────────── */}
                {tab === 'reports' && (
                    <>
                        <div className={styles.filters}>
                            <select
                                id="report-status-filter"
                                className={styles.select}
                                value={status}
                                onChange={e => { setStatus(e.target.value); setPage(1); }}
                                aria-label="Filter reports by status"
                            >
                                <option value="">All statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="UNDER_REVIEW">Under Review</option>
                                <option value="RESOLVED_BAN">Resolved — Ban</option>
                                <option value="RESOLVED_WARNING">Resolved — Warning</option>
                                <option value="DISMISSED">Dismissed</option>
                                <option value="APPEALED">Appealed</option>
                            </select>
                        </div>

                        {error && (
                            <div className={styles.errorBanner} role="alert">
                                <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                {error}
                            </div>
                        )}

                        <div className={styles.tableWrapper} role="region" aria-label="Reports table">
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th scope="col">Reporter</th>
                                        <th scope="col">Reported</th>
                                        <th scope="col">Category</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Actions Taken</th>
                                        <th scope="col">Date</th>
                                        <th scope="col">Tools</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading
                                        ? Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i} aria-hidden="true">
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <td key={j}><div className={styles.skeleton} /></td>
                                                ))}
                                            </tr>
                                        ))
                                        : reports.length === 0
                                        ? <tr><td colSpan={7} className={styles.empty}>No reports found</td></tr>
                                        : reports.map(r => (
                                            <tr key={r.id} className={styles.row}>
                                                <td>
                                                    <div className={styles.displayName}>{r.reporter?.displayName || '—'}</div>
                                                    <div className={styles.handle}>@{r.reporter?.handle || '?'}</div>
                                                </td>
                                                <td>
                                                    <div className={styles.displayName}>{r.reported?.displayName || '—'}</div>
                                                    <div className={styles.handle}>@{r.reported?.handle || '?'}</div>
                                                </td>
                                                <td>
                                                    <span className={styles.chip} style={{ color: '#A0A0B5', borderColor: 'rgba(160,160,181,0.3)' }}>
                                                        {r.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={styles.chip}
                                                        style={{
                                                            color: STATUS_COLORS[r.status] ?? '#A0A0B5',
                                                            borderColor: (STATUS_COLORS[r.status] ?? '#A0A0B5') + '44',
                                                        }}
                                                    >
                                                        {r.status}
                                                    </span>
                                                </td>

                                                {/* ── Actions Taken — now shows moderator + action type ── */}
                                                <td className={styles.actionsCell}>
                                                    {!r.modActions || r.modActions.length === 0 ? (
                                                        <span className={styles.noAction}>—</span>
                                                    ) : (
                                                        <>
                                                            {r.modActions.slice(0, 2).map((a: any) => (
                                                                <div key={a.id} className={styles.actionBadge}>
                                                                    <span
                                                                        className={styles.chip}
                                                                        style={{
                                                                            color: ACTION_COLORS[a.action] ?? '#A0A0B5',
                                                                            borderColor: (ACTION_COLORS[a.action] ?? '#A0A0B5') + '55',
                                                                            fontSize: '10px',
                                                                        }}
                                                                    >
                                                                        {a.action}
                                                                    </span>
                                                                    <span className={styles.modByLabel}>
                                                                        by @{a.moderator?.handle ?? '?'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {r.modActions.length > 2 && (
                                                                <span className={styles.moreActions}>
                                                                    +{r.modActions.length - 2} more
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </td>

                                                <td className={styles.date}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    <div className={styles.actions}>
                                                        <button
                                                            className={styles.actionBtn}
                                                            onClick={() => setSelectedReportId(r.id)}
                                                            title="View full report details"
                                                            aria-label="View report details"
                                                            id={`view-report-${r.id}`}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        {r.modActions?.[0] && (
                                                            <button
                                                                className={`${styles.actionBtn} ${styles.danger}`}
                                                                onClick={() => handleReverseAction(r.modActions[0].id, r.modActions[0].action)}
                                                                title={`Reverse ${r.modActions[0].action}`}
                                                                aria-label={`Reverse ${r.modActions[0].action}`}
                                                                id={`reverse-action-${r.id}`}
                                                            >
                                                                <Undo2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>

                        {pages > 1 && (
                            <nav className={styles.pagination} aria-label="Reports pagination">
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className={styles.pageInfo}>{page} / {pages}</span>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                                    disabled={page === pages}
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </nav>
                        )}
                    </>
                )}

                {/* ── TAB 2 — Moderator Activity ──────────────────────────── */}
                {tab === 'moderator' && (
                    <div className={styles.modActivityLayout}>

                        {/* Left panel — moderator list + search */}
                        <div className={styles.modListPanel}>
                            <div className={styles.modSearchWrapper}>
                                <span className={styles.modSearchIcon}><Search size={14} /></span>
                                <input
                                    id="mod-search-input"
                                    className={styles.modSearchInput}
                                    placeholder="Search moderator…"
                                    value={modSearch}
                                    onChange={e => setModSearch(e.target.value)}
                                    aria-label="Search moderator by name or handle"
                                />
                            </div>

                            {modError && (
                                <div className={styles.errorBanner} role="alert">
                                    <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                    {modError}
                                </div>
                            )}

                            {modsLoading ? (
                                <div className={styles.modLoadingState}>Loading moderators…</div>
                            ) : filteredMods.length === 0 ? (
                                <div className={styles.modEmpty}>
                                    {modSearch ? 'No moderators match your search' : 'No moderators found'}
                                </div>
                            ) : (
                                <ul className={styles.modList} role="list">
                                    {filteredMods.map((mod: any) => {
                                        const total = mod._count?.modActionsBy ?? mod.stats?.totalActions ?? 0;
                                        const isActive = selectedMod?.id === mod.id;
                                        return (
                                            <li key={mod.id}>
                                                <button
                                                    className={`${styles.modItem} ${isActive ? styles.modItemActive : ''}`}
                                                    onClick={() => handleSelectMod(mod)}
                                                    id={`select-mod-${mod.id}`}
                                                    aria-pressed={isActive}
                                                >
                                                    <div className={styles.modAvatar}>
                                                        {mod.avatarUrl
                                                            ? <img src={mod.avatarUrl} alt="" width={36} height={36} />
                                                            : <span>{(mod.displayName || '?')[0].toUpperCase()}</span>
                                                        }
                                                    </div>
                                                    <div className={styles.modInfo}>
                                                        <div className={styles.modName}>{mod.displayName}</div>
                                                        <div className={styles.modHandle}>@{mod.handle}</div>
                                                    </div>
                                                    <div className={styles.modActionCount}>
                                                        <span className={styles.modActionNumber}>{total}</span>
                                                        <span className={styles.modActionLabel}>actions</span>
                                                    </div>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Right panel — selected moderator's action history */}
                        <div className={styles.modActionPanel}>
                            {!selectedMod ? (
                                <div className={styles.noModSelected}>
                                    <span className={styles.noModIcon}><Shield size={32} /></span>
                                    <p>Select a moderator on the left to view their full action history</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.modDetailHeader}>
                                        <div>
                                            <h2 className={styles.modDetailName}>{selectedMod.displayName}</h2>
                                            <span className={styles.modDetailHandle}>@{selectedMod.handle}</span>
                                        </div>
                                        <span className={styles.modDetailCount}>
                                            {modActionsLoading ? '…' : modActions.length} actions
                                        </span>
                                    </div>

                                    {modActionsLoading ? (
                                        <div className={styles.modLoadingState}>Loading actions…</div>
                                    ) : modActions.length === 0 ? (
                                        <div className={styles.modEmpty}>This moderator has no recorded actions yet.</div>
                                    ) : (
                                        <div className={styles.tableWrapper}>
                                            <table className={styles.table} aria-label={`Actions by ${selectedMod.displayName}`}>
                                                <thead>
                                                    <tr>
                                                        <th scope="col">Date</th>
                                                        <th scope="col">Action</th>
                                                        <th scope="col">Target User</th>
                                                        <th scope="col">Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {modActions.map((a: any) => (
                                                        <tr key={a.id} className={styles.row}>
                                                            <td className={styles.date}>
                                                                {new Date(a.createdAt).toLocaleDateString()}<br />
                                                                <span style={{ fontSize: '11px', color: '#666' }}>
                                                                    {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className={styles.chip}
                                                                    style={{
                                                                        color: ACTION_COLORS[a.action] ?? '#A0A0B5',
                                                                        borderColor: (ACTION_COLORS[a.action] ?? '#A0A0B5') + '55',
                                                                    }}
                                                                >
                                                                    {a.action}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {a.target ? (
                                                                    <>
                                                                        <div className={styles.displayName}>{a.target.displayName}</div>
                                                                        <div className={styles.handle}>@{a.target.handle}</div>
                                                                    </>
                                                                ) : '—'}
                                                            </td>
                                                            <td className={styles.reasonCell}>
                                                                {a.reason || <span style={{ color: '#555' }}>No reason provided</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Drawer + Modals */}
            <ModerationReportDrawer
                reportId={selectedReportId}
                onClose={() => setSelectedReportId(null)}
                onActionTaken={() => { setSelectedReportId(null); loadReports(); }}
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
