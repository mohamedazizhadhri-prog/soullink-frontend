'use client';

/**
 * Admin Audit Logs Page — /admin/audit-logs
 * EF-073 — System-Wide Audit Logs
 *
 * 4-Tab Architecture:
 *   🏛️  Community   → AuditLog (server-scoped events)
 *   🛡️  Moderation  → ModAction (bans, warnings, suspensions)
 *   Community   → AuditLog (server-scoped events)
 *   Moderation  → ModAction (bans, warnings, suspensions)
 *   Admin       → SystemLog (role changes, dissolves, AI deploys)
 *   Security    → LoginHistory (logins, failures, IPs)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Users,
    Shield,
    Settings,
    Lock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
    X,
    RotateCw,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import s from './audit-logs.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'community' | 'moderation' | 'admin' | 'security';

interface PageState {
    logs:    any[];
    total:   number;
    page:    number;
    loading: boolean;
    error:   string | null;
}

const LIMIT = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initState(): PageState {
    return { logs: [], total: 0, page: 1, loading: true, error: null };
}

/** Pick a badge variant based on action string */
function getBadgeVariant(action: string): string {
    const a = action.toUpperCase();
    if (['BAN', 'BANNED', 'HARD_DELETE', 'DISSOLVED', 'SUSPENSION', 'CONTENT_REMOVAL'].some(k => a.includes(k))) return 'danger';
    if (['WARN', 'WARNING', 'MUTE', 'KICK', 'SUSPENDED', 'STATUS_CHANGED', 'SOFT_DELETE'].some(k => a.includes(k)))  return 'warn';
    if (['UNBAN', 'UNBANNED', 'ACTIVE', 'JOIN'].some(k => a.includes(k))) return 'success';
    if (['AI_MODEL', 'SYSTEM', 'DEPLOY', 'CONFIG', 'ROLE_CHANGE', 'ROLE_CHANGED'].some(k => a.includes(k))) return 'purple';
    if (['CREATE', 'ADD', 'UPDATE'].some(k => a.includes(k))) return 'info';
    return 'neutral';
}

function getCategoryClass(cat: string): string {
    return { ADMIN: 'admin', MODERATION: 'moderation', SECURITY: 'security', SYSTEM: 'system' }[cat] ?? 'system';
}

function fmtDate(d: string | Date) {
    return new Date(d).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function UserCell({ user, fallback }: { user?: any; fallback?: string }) {
    if (!user) return <span className={s.systemActor}>{fallback ?? 'System'}</span>;
    return (
        <div className={s.userCell}>
            <div className={s.avatar}>
                {user.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.displayName} />
                    : user.displayName?.[0]?.toUpperCase()}
            </div>
            <div>
                <div className={s.displayName}>{user.displayName}</div>
                <div className={s.handle}>@{user.handle}</div>
            </div>
        </div>
    );
}

function SkeletonRows({ cols }: { cols: number }) {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} aria-hidden>
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j}><div className={s.skeleton} /></td>
                    ))}
                </tr>
            ))}
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminAuditLogsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('community');

    // Per-tab state
    const [community,  setCommunity]  = useState<PageState>(initState());
    const [moderation, setModeration] = useState<PageState>(initState());
    const [adminLogs,  setAdminLogs]  = useState<PageState>(initState());
    const [security,   setSecurity]   = useState<PageState>(initState());

    // Per-tab filters
    const [communityFilter, setCommunityFilter] = useState({ action: '', from: '', to: '' });
    const [modFilter,       setModFilter]       = useState({ action: '', from: '', to: '' });
    const [adminFilter,     setAdminFilter]     = useState({ category: '', action: '', from: '', to: '' });
    const [secFilter,       setSecFilter]       = useState({ success: '', from: '', to: '' });

    // Expanded rows
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const toggleExpand = (id: string) => setExpanded(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    // Totals for tab badges (loaded once)
    const [totals, setTotals] = useState({ community: 0, moderation: 0, admin: 0, security: 0 });
    const totalsLoaded = useRef(false);

    // ── Loaders ──────────────────────────────────────────────────────────────

    const loadCommunity = useCallback(async (page = 1) => {
        setCommunity(p => ({ ...p, loading: true, error: null }));
        try {
            const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
            if (communityFilter.action) params.action = communityFilter.action;
            if (communityFilter.from)   params.from   = communityFilter.from;
            if (communityFilter.to)     params.to     = communityFilter.to;
            const data = await adminApi.listAuditLogs(params);
            setCommunity({ logs: data.logs ?? [], total: data.total ?? 0, page, loading: false, error: null });
        } catch (e: any) { setCommunity(p => ({ ...p, loading: false, error: e.message })); }
    }, [communityFilter]);

    const loadModeration = useCallback(async (page = 1) => {
        setModeration(p => ({ ...p, loading: true, error: null }));
        try {
            const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
            if (modFilter.action) params.action = modFilter.action;
            if (modFilter.from)   params.from   = modFilter.from;
            if (modFilter.to)     params.to     = modFilter.to;
            const data = await adminApi.listModLogs(params);
            setModeration({ logs: data.logs ?? [], total: data.total ?? 0, page, loading: false, error: null });
        } catch (e: any) { setModeration(p => ({ ...p, loading: false, error: e.message })); }
    }, [modFilter]);

    const loadAdmin = useCallback(async (page = 1) => {
        setAdminLogs(p => ({ ...p, loading: true, error: null }));
        try {
            const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
            if (adminFilter.category) params.category = adminFilter.category;
            if (adminFilter.action)   params.action   = adminFilter.action;
            if (adminFilter.from)     params.from     = adminFilter.from;
            if (adminFilter.to)       params.to       = adminFilter.to;
            const data = await adminApi.listSystemLogs(params);
            setAdminLogs({ logs: data.logs ?? [], total: data.total ?? 0, page, loading: false, error: null });
        } catch (e: any) { setAdminLogs(p => ({ ...p, loading: false, error: e.message })); }
    }, [adminFilter]);

    const loadSecurity = useCallback(async (page = 1) => {
        setSecurity(p => ({ ...p, loading: true, error: null }));
        try {
            const params: Record<string, string> = { page: String(page), limit: String(LIMIT) };
            if (secFilter.success) params.success = secFilter.success;
            if (secFilter.from)    params.from    = secFilter.from;
            if (secFilter.to)      params.to      = secFilter.to;
            const data = await adminApi.listSecurityLogs(params);
            setSecurity({ logs: data.logs ?? [], total: data.total ?? 0, page, loading: false, error: null });
        } catch (e: any) { setSecurity(p => ({ ...p, loading: false, error: e.message })); }
    }, [secFilter]);

    // Load totals once on mount
    useEffect(() => {
        if (totalsLoaded.current) return;
        totalsLoaded.current = true;
        Promise.all([
            adminApi.listAuditLogs({ page: '1', limit: '1' }),
            adminApi.listModLogs({ page: '1', limit: '1' }),
            adminApi.listSystemLogs({ page: '1', limit: '1' }),
            adminApi.listSecurityLogs({ page: '1', limit: '1' }),
        ]).then(([c, m, a, sec]) => {
            setTotals({ community: c.total ?? 0, moderation: m.total ?? 0, admin: a.total ?? 0, security: sec.total ?? 0 });
        }).catch(() => {});
    }, []);

    // Reload when tab or filters change
    useEffect(() => { if (activeTab === 'community')  loadCommunity(1); },  [activeTab, communityFilter, loadCommunity]);
    useEffect(() => { if (activeTab === 'moderation') loadModeration(1); }, [activeTab, modFilter, loadModeration]);
    useEffect(() => { if (activeTab === 'admin')      loadAdmin(1); },      [activeTab, adminFilter, loadAdmin]);
    useEffect(() => { if (activeTab === 'security')   loadSecurity(1); },   [activeTab, secFilter, loadSecurity]);

    const currentState = { community, moderation, admin: adminLogs, security }[activeTab];
    const currentPages = Math.ceil(currentState.total / LIMIT);

    const handleRefresh = () => {
        const { page } = currentState;
        if (activeTab === 'community')  loadCommunity(page);
        if (activeTab === 'moderation') loadModeration(page);
        if (activeTab === 'admin')      loadAdmin(page);
        if (activeTab === 'security')   loadSecurity(page);
    };

    const handlePage = (p: number) => {
        setExpanded(new Set());
        if (activeTab === 'community')  loadCommunity(p);
        if (activeTab === 'moderation') loadModeration(p);
        if (activeTab === 'admin')      loadAdmin(p);
        if (activeTab === 'security')   loadSecurity(p);
    };

    // ── Tabs config ──────────────────────────────────────────────────────────

    const TABS: { id: Tab; icon: React.ReactNode; label: string; count: number }[] = [
        { id: 'community',  icon: <Users size={16} />, label: 'Community',  count: totals.community },
        { id: 'moderation', icon: <Shield size={16} />, label: 'Moderation', count: totals.moderation },
        { id: 'admin',      icon: <Settings size={16} />, label: 'Admin',      count: totals.admin },
        { id: 'security',   icon: <Lock size={16} />, label: 'Security',   count: totals.security },
    ];

    // ── Community Columns ─────────────────────────────────────────────────────
    const COMMUNITY_ACTIONS = [
        'MEMBER_JOIN','MEMBER_LEAVE','MEMBER_BAN','MEMBER_KICK',
        'MEMBER_TIMEOUT','CHANNEL_CREATE','CHANNEL_DELETE','SERVER_UPDATE',
        'ROLE_UPDATE','MESSAGE_DELETE','ANNOUNCEMENT',
    ];

    // ── Mod Action Types ──────────────────────────────────────────────────────
    const MOD_ACTIONS = ['WARNING','SUSPENSION','BAN','UNBAN','CONTENT_REMOVAL','MUTE'];

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={s.shell}>
            <AdminSidebar />
            <main className={s.main}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <h1 className={s.title}>
                            <span className={s.titleIcon}><Settings size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} /></span>Audit Logs
                        </h1>
                        <span className={s.count}>{currentState.total.toLocaleString()} entries</span>
                    </div>
                    <button
                        className={s.refreshBtn}
                        onClick={handleRefresh}
                        disabled={currentState.loading}
                        aria-label="Refresh logs"
                    >
                        <RotateCw size={14} className={currentState.loading ? s.spin : ''} style={{ marginRight: 6 }} />
                        Refresh
                    </button>
                </div>

                {/* ── Stats Row ───────────────────────────────────────────── */}
                <div className={s.statsRow}>
                    {TABS.map(t => (
                        <div
                            key={t.id}
                            className={s.statCard}
                            style={{ cursor: 'pointer', outline: activeTab === t.id ? '1px solid rgba(123,104,238,0.4)' : 'none' }}
                            onClick={() => { setActiveTab(t.id); setExpanded(new Set()); }}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={s.statLabel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className={s.statIcon} style={{ color: activeTab === t.id ? '#7B68EE' : '#A0A0B5' }}>{t.icon}</span>
                                <span>{t.label}</span>
                            </div>
                            <div className={s.statValue}>{t.count.toLocaleString()}</div>
                            <div className={s.statSub}>total entries</div>
                        </div>
                    ))}
                </div>

                {/* ── Tab Bar ─────────────────────────────────────────────── */}
                <div className={s.tabBar} role="tablist" aria-label="Audit log categories">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            role="tab"
                            aria-selected={activeTab === t.id}
                            className={`${s.tab} ${activeTab === t.id ? s.active : ''}`}
                            onClick={() => { setActiveTab(t.id); setExpanded(new Set()); }}
                            id={`audit-tab-${t.id}`}
                        >
                            <span className={s.tabIcon} style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginRight: 6 }}>{t.icon}</span>
                            <span>{t.label}</span>
                            <span className={s.tabBadge}>{t.count.toLocaleString()}</span>
                        </button>
                    ))}
                </div>

                {/* ── Filters ─────────────────────────────────────────────── */}

                {activeTab === 'community' && (
                    <div className={s.filters}>
                        <span className={s.filterLabel}>Filter</span>
                        <select className={s.select} value={communityFilter.action}
                            onChange={e => setCommunityFilter(f => ({ ...f, action: e.target.value }))}
                            aria-label="Filter by action">
                            <option value="">All actions</option>
                            {COMMUNITY_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                        </select>
                        <input type="date" className={s.dateInput} value={communityFilter.from}
                            onChange={e => setCommunityFilter(f => ({ ...f, from: e.target.value }))} aria-label="From date" />
                        <input type="date" className={s.dateInput} value={communityFilter.to}
                            onChange={e => setCommunityFilter(f => ({ ...f, to: e.target.value }))} aria-label="To date" />
                        <button className={s.clearBtn} onClick={() => setCommunityFilter({ action: '', from: '', to: '' })}><X size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Clear</button>
                    </div>
                )}

                {activeTab === 'moderation' && (
                    <div className={s.filters}>
                        <span className={s.filterLabel}>Filter</span>
                        <select className={s.select} value={modFilter.action}
                            onChange={e => setModFilter(f => ({ ...f, action: e.target.value }))}
                            aria-label="Filter by action type">
                            <option value="">All actions</option>
                            {MOD_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <input type="date" className={s.dateInput} value={modFilter.from}
                            onChange={e => setModFilter(f => ({ ...f, from: e.target.value }))} aria-label="From date" />
                        <input type="date" className={s.dateInput} value={modFilter.to}
                            onChange={e => setModFilter(f => ({ ...f, to: e.target.value }))} aria-label="To date" />
                        <button className={s.clearBtn} onClick={() => setModFilter({ action: '', from: '', to: '' })}><X size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Clear</button>
                    </div>
                )}

                {activeTab === 'admin' && (
                    <div className={s.filters}>
                        <span className={s.filterLabel}>Filter</span>
                        <select className={s.select} value={adminFilter.category}
                            onChange={e => setAdminFilter(f => ({ ...f, category: e.target.value }))}
                            aria-label="Filter by category">
                            <option value="">All categories</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SYSTEM">SYSTEM</option>
                            <option value="MODERATION">MODERATION</option>
                            <option value="SECURITY">SECURITY</option>
                        </select>
                        <input className={s.searchInput} placeholder="Search action…" value={adminFilter.action}
                            onChange={e => setAdminFilter(f => ({ ...f, action: e.target.value }))}
                            aria-label="Search by action" />
                        <input type="date" className={s.dateInput} value={adminFilter.from}
                            onChange={e => setAdminFilter(f => ({ ...f, from: e.target.value }))} aria-label="From date" />
                        <input type="date" className={s.dateInput} value={adminFilter.to}
                            onChange={e => setAdminFilter(f => ({ ...f, to: e.target.value }))} aria-label="To date" />
                        <button className={s.clearBtn} onClick={() => setAdminFilter({ category: '', action: '', from: '', to: '' })}><X size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Clear</button>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className={s.filters}>
                        <span className={s.filterLabel}>Filter</span>
                        <select className={s.select} value={secFilter.success}
                            onChange={e => setSecFilter(f => ({ ...f, success: e.target.value }))}
                            aria-label="Filter by login outcome">
                            <option value="">All outcomes</option>
                            <option value="true">Successful</option>
                            <option value="false">Failed</option>
                        </select>
                        <input type="date" className={s.dateInput} value={secFilter.from}
                            onChange={e => setSecFilter(f => ({ ...f, from: e.target.value }))} aria-label="From date" />
                        <input type="date" className={s.dateInput} value={secFilter.to}
                            onChange={e => setSecFilter(f => ({ ...f, to: e.target.value }))} aria-label="To date" />
                        <button className={s.clearBtn} onClick={() => setSecFilter({ success: '', from: '', to: '' })}><X size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Clear</button>
                    </div>
                )}

                {/* ── Error ───────────────────────────────────────────────── */}
                {currentState.error && (
                    <div className={s.errorBanner} role="alert">
                        <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {currentState.error}
                    </div>
                )}

                {/* ── Table ───────────────────────────────────────────────── */}
                <div
                    className={s.tableWrapper}
                    role="tabpanel"
                    aria-labelledby={`audit-tab-${activeTab}`}
                >

                    {/* ── COMMUNITY TAB ─────────────────────────────────── */}
                    {activeTab === 'community' && (
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Action</th>
                                    <th scope="col">Actor</th>
                                    <th scope="col">Server</th>
                                    <th scope="col">Target</th>
                                    <th scope="col">Date</th>
                                    <th scope="col"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {community.loading
                                    ? <SkeletonRows cols={6} />
                                    : community.logs.length === 0
                                    ? <tr className={s.emptyRow}><td colSpan={6}><span className={s.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8, verticalAlign: 'middle' }}><Users size={16} /></span>No community logs found</td></tr>
                                    : community.logs.flatMap(log => {
                                        const isOpen = expanded.has(log.id);
                                        const variant = getBadgeVariant(log.action);
                                        const detail = JSON.stringify(log.details ?? {}, null, 2);
                                        return [
                                            <tr key={log.id}
                                                className={`${s.row} ${isOpen ? s.rowExpanded : ''}`}
                                                onClick={() => toggleExpand(log.id)}
                                                aria-expanded={isOpen}>
                                                <td>
                                                    <span className={`${s.badge} ${s[variant]}`}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td><UserCell user={log.actor} /></td>
                                                <td><span className={s.meta}>{log.serverId ?? '—'}</span></td>
                                                <td><span className={s.meta}>{log.targetId ?? '—'}</span></td>
                                                <td><span className={s.date}>{fmtDate(log.createdAt)}</span></td>
                                                <td><span className={`${s.expandChevron} ${isOpen ? s.open : ''}`}><ChevronRight size={14} /></span></td>
                                            </tr>,
                                            isOpen && (
                                                <tr key={`${log.id}-detail`} className={s.detailRow}>
                                                    <td colSpan={6} className={s.detailCell}>
                                                        <pre className={s.detailBox}>{detail}</pre>
                                                    </td>
                                                </tr>
                                            ),
                                        ].filter(Boolean);
                                    })
                                }
                            </tbody>
                        </table>
                    )}

                    {/* ── MODERATION TAB ────────────────────────────────── */}
                    {activeTab === 'moderation' && (
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Action</th>
                                    <th scope="col">Moderator</th>
                                    <th scope="col">Target User</th>
                                    <th scope="col">Reason</th>
                                    <th scope="col">Report</th>
                                    <th scope="col">Date</th>
                                    <th scope="col"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {moderation.loading
                                    ? <SkeletonRows cols={7} />
                                    : moderation.logs.length === 0
                                    ? <tr className={s.emptyRow}><td colSpan={7}><span className={s.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8, verticalAlign: 'middle' }}><Shield size={16} /></span>No moderation actions found</td></tr>
                                    : moderation.logs.flatMap(log => {
                                        const isOpen = expanded.has(log.id);
                                        const variant = getBadgeVariant(log.action);
                                        return [
                                            <tr key={log.id}
                                                className={`${s.row} ${isOpen ? s.rowExpanded : ''}`}
                                                onClick={() => toggleExpand(log.id)}
                                                aria-expanded={isOpen}>
                                                <td>
                                                    <span className={`${s.badge} ${s[variant]}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td><UserCell user={log.moderator} /></td>
                                                <td><UserCell user={log.target} /></td>
                                                <td>
                                                    <span className={s.meta} title={log.reason}>
                                                        {log.reason?.length > 55 ? log.reason.slice(0, 55) + '…' : log.reason ?? '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {log.report
                                                        ? <span className={`${s.badge} ${s.neutral}`} style={{ fontSize: '10px' }}>
                                                            {log.report.category}
                                                          </span>
                                                        : <span className={s.meta}>—</span>}
                                                </td>
                                                <td><span className={s.date}>{fmtDate(log.createdAt)}</span></td>
                                                <td><span className={`${s.expandChevron} ${isOpen ? s.open : ''}`}><ChevronRight size={14} /></span></td>
                                            </tr>,
                                            isOpen && (
                                                <tr key={`${log.id}-detail`} className={s.detailRow}>
                                                    <td colSpan={7} className={s.detailCell}>
                                                        <pre className={s.detailBox}>{JSON.stringify({
                                                            id: log.id,
                                                            action: log.action,
                                                            reason: log.reason,
                                                            duration: log.duration,
                                                            expiresAt: log.expiresAt,
                                                            reportId: log.reportId,
                                                            target: log.target,
                                                            moderator: log.moderator,
                                                        }, null, 2)}</pre>
                                                    </td>
                                                </tr>
                                            ),
                                        ].filter(Boolean);
                                    })
                                }
                            </tbody>
                        </table>
                    )}

                    {/* ── ADMIN TAB ─────────────────────────────────────── */}
                    {activeTab === 'admin' && (
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th scope="col">Category</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Actor</th>
                                    <th scope="col">Target ID</th>
                                    <th scope="col">Date</th>
                                    <th scope="col"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {adminLogs.loading
                                    ? <SkeletonRows cols={6} />
                                    : adminLogs.logs.length === 0
                                    ? <tr className={s.emptyRow}><td colSpan={6}><span className={s.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8, verticalAlign: 'middle' }}><Settings size={16} /></span>No admin system logs yet — actions will appear here as admins take them</td></tr>
                                    : adminLogs.logs.flatMap(log => {
                                        const isOpen = expanded.has(log.id);
                                        const catClass = getCategoryClass(log.category);
                                        const variant  = getBadgeVariant(log.action);
                                        return [
                                            <tr key={log.id}
                                                className={`${s.row} ${isOpen ? s.rowExpanded : ''}`}
                                                onClick={() => toggleExpand(log.id)}
                                                aria-expanded={isOpen}>
                                                <td>
                                                    <span className={`${s.catChip} ${s[catClass]}`}>
                                                        {log.category}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`${s.badge} ${s[variant]}`} style={{ fontSize: '11px' }}>
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td><UserCell user={log.actor} fallback="System" /></td>
                                                <td><span className={s.meta}>{log.targetId?.slice(0, 12) ?? '—'}{log.targetId?.length > 12 ? '…' : ''}</span></td>
                                                <td><span className={s.date}>{fmtDate(log.createdAt)}</span></td>
                                                <td><span className={`${s.expandChevron} ${isOpen ? s.open : ''}`}><ChevronRight size={14} /></span></td>
                                            </tr>,
                                            isOpen && (
                                                <tr key={`${log.id}-detail`} className={s.detailRow}>
                                                    <td colSpan={6} className={s.detailCell}>
                                                        <pre className={s.detailBox}>{JSON.stringify({
                                                            id: log.id,
                                                            category: log.category,
                                                            action: log.action,
                                                            actorId: log.actorId,
                                                            targetId: log.targetId,
                                                            metadata: log.metadata,
                                                            createdAt: log.createdAt,
                                                        }, null, 2)}</pre>
                                                    </td>
                                                </tr>
                                            ),
                                        ].filter(Boolean);
                                    })
                                }
                            </tbody>
                        </table>
                    )}

                    {/* ── SECURITY TAB ──────────────────────────────────── */}
                    {activeTab === 'security' && (
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th scope="col">User</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">IP Address</th>
                                    <th scope="col">User Agent</th>
                                    <th scope="col">Date</th>
                                    <th scope="col"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {security.loading
                                    ? <SkeletonRows cols={6} />
                                    : security.logs.length === 0
                                    ? <tr className={s.emptyRow}><td colSpan={6}><span className={s.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8, verticalAlign: 'middle' }}><Lock size={16} /></span>No login events found</td></tr>
                                    : security.logs.flatMap(log => {
                                        const isOpen = expanded.has(log.id);
                                        return [
                                            <tr key={log.id}
                                                className={`${s.row} ${isOpen ? s.rowExpanded : ''}`}
                                                onClick={() => toggleExpand(log.id)}
                                                aria-expanded={isOpen}>
                                                <td><UserCell user={log.user} fallback="Unknown" /></td>
                                                <td>
                                                    <span className={`${s.pill} ${log.success ? s.ok : s.fail}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        {log.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                        <span>{log.success ? 'Success' : 'Failed'}</span>
                                                    </span>
                                                </td>
                                                <td><span className={s.ipText}>{log.ipAddress ?? '—'}</span></td>
                                                <td>
                                                    <span className={s.meta} title={log.userAgent}>
                                                        {log.userAgent?.length > 50 ? log.userAgent.slice(0, 50) + '…' : log.userAgent ?? '—'}
                                                    </span>
                                                </td>
                                                <td><span className={s.date}>{fmtDate(log.createdAt)}</span></td>
                                                <td><span className={`${s.expandChevron} ${isOpen ? s.open : ''}`}><ChevronRight size={14} /></span></td>
                                            </tr>,
                                            isOpen && (
                                                <tr key={`${log.id}-detail`} className={s.detailRow}>
                                                    <td colSpan={6} className={s.detailCell}>
                                                        <pre className={s.detailBox}>{JSON.stringify({
                                                            id: log.id,
                                                            userId: log.userId,
                                                            success: log.success,
                                                            ipAddress: log.ipAddress,
                                                            userAgent: log.userAgent,
                                                            createdAt: log.createdAt,
                                                            user: log.user,
                                                        }, null, 2)}</pre>
                                                    </td>
                                                </tr>
                                            ),
                                        ].filter(Boolean);
                                    })
                                }
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination ──────────────────────────────────────────── */}
                {currentPages > 1 && (
                    <nav className={s.pagination} aria-label="Audit logs pagination">
                        <button className={s.pageBtn}
                            onClick={() => handlePage(currentState.page - 1)}
                            disabled={currentState.page <= 1 || currentState.loading}
                            aria-label="Previous page"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className={s.pageInfo}>
                            {currentState.page} / {currentPages}
                        </span>
                        <button className={s.pageBtn}
                            onClick={() => handlePage(currentState.page + 1)}
                            disabled={currentState.page >= currentPages || currentState.loading}
                            aria-label="Next page"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </nav>
                )}

            </main>
        </div>
    );
}
