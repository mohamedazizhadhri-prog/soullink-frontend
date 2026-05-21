'use client';

/**
 * Admin Overview Page — /admin
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6.1
 * 
 * Displays:
 *  - Platform KPI cards (users, active, retention, servers)
 *  - API Credit burn gauges (GROQ, Cohere, Pinecone, ElevenLabs, etc.)
 *  - Pending queue counters (reports, appeals)
 */

import React, { useEffect, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import styles from './page.module.css';
import {
    Zap,
    AlertTriangle,
    Users,
    Flame,
    Globe,
    Flag,
} from 'lucide-react';

interface SystemStats {
    users: { total: number; newInPeriod: number; activeInPeriod: number; retentionRate: string };
    matching: { totalMatches: number };
    moderation: { pendingReports: number; pendingAppeals?: number };
    serverCount?: number;
}

interface CreditGauge {
    service: string;
    used: number;
    limit: number;
    percentage: string;
}

const DANGER_THRESHOLD = 80;
const WARN_THRESHOLD   = 60;

function gaugeColor(pct: number) {
    if (pct >= DANGER_THRESHOLD) return '#FF4444';
    if (pct >= WARN_THRESHOLD)   return '#FFD700';
    return '#20B2AA';
}

export default function AdminOverviewPage() {
    const [stats,     setStats]     = useState<SystemStats | null>(null);
    const [credits,   setCredits]   = useState<CreditGauge[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        Promise.all([
            adminApi.getSystemAnalytics(30),
            adminApi.getCreditUsage(),
            adminApi.listServers({ page: 1, limit: 1 }),
        ])
            .then(([s, c, srv]) => {
                // Normalize the system analytics response — works for both 'snapshot' and 'live' source
                const normalized: SystemStats = {
                    users: {
                        total:          s?.users?.total          ?? 0,
                        newInPeriod:    s?.users?.newInPeriod    ?? 0,
                        activeInPeriod: s?.users?.activeInPeriod ?? 0,
                        retentionRate:  s?.users?.retentionRate  ?? '0',
                    },
                    matching:   { totalMatches: s?.matching?.totalMatches ?? 0 },
                    moderation: { pendingReports: s?.moderation?.pendingReports ?? 0, pendingAppeals: s?.moderation?.appeals ?? 0 },
                    serverCount: srv?.total ?? 0,
                };
                setStats(normalized);
                setCredits(Array.isArray(c) ? c : []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const handleRefreshCredits = async () => {
        setRefreshing(true);
        try {
            const fresh = await adminApi.refreshCredits();
            setCredits(Array.isArray(fresh) ? fresh : []);
        } catch (e: any) {
            setError('Credit refresh failed: ' + e.message);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className={styles.shell}>
            <AdminSidebar />

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>
                            <span className={styles.titleIcon}><Zap size={20} /></span> Admin Overview
                        </h1>
                        <p className={styles.subtitle}>God-mode platform control panel</p>
                    </div>
                    <span className={styles.badge}>ADMIN</span>
                </header>

                {error && (
                    <div className={styles.errorBanner} role="alert">
                        <AlertTriangle size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}
                    </div>
                )}

                {loading ? (
                    <div className={styles.loadingGrid}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={styles.skeletonCard} aria-hidden="true" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* ── KPI Cards ─────────────────────────────────────────── */}
                        <section aria-labelledby="kpi-heading">
                            <h2 id="kpi-heading" className={styles.sectionTitle}>Platform Health</h2>
                            <div className={styles.kpiGrid}>
                                <KPICard
                                    id="kpi-total-users"
                                    label="Total Users"
                                    value={stats?.users.total.toLocaleString() ?? '—'}
                                    icon={<Users size={18} />}
                                    sub={`+${stats?.users.newInPeriod ?? 0} this month`}
                                    color="#7B68EE"
                                />
                                <KPICard
                                    id="kpi-active-users"
                                    label="Active (30d)"
                                    value={stats?.users.activeInPeriod.toLocaleString() ?? '—'}
                                    icon={<Flame size={18} />}
                                    sub={`${stats?.users.retentionRate ?? 0}% retention`}
                                    color="#00BFFF"
                                />
                                <KPICard
                                    id="kpi-servers"
                                    label="Communities"
                                    value={stats?.serverCount?.toLocaleString() ?? '—'}
                                    icon={<Globe size={18} />}
                                    color="#20B2AA"
                                />
                                <KPICard
                                    id="kpi-pending-reports"
                                    label="Pending Reports"
                                    value={stats?.moderation.pendingReports.toLocaleString() ?? '—'}
                                    icon={<Flag size={18} />}
                                    color={stats && stats.moderation.pendingReports > 20 ? '#FF4444' : '#FFD700'}
                                    sub={`${stats?.moderation.pendingAppeals ?? 0} appeals too`}
                                />
                            </div>
                        </section>

                        {/* ── Credit Burn Gauges ─────────────────────────────────── */}
                        <section aria-labelledby="credits-heading">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <h2 id="credits-heading" className={styles.sectionTitle} style={{ margin: 0 }}>API Credit Burn</h2>
                                <button
                                    onClick={handleRefreshCredits}
                                    disabled={refreshing}
                                    style={{
                                        marginLeft: 'auto',
                                        padding: '6px 14px',
                                        background: refreshing ? 'rgba(255,255,255,0.05)' : 'rgba(123,104,238,0.2)',
                                        border: '1px solid rgba(123,104,238,0.4)',
                                        borderRadius: 8,
                                        color: '#7B68EE',
                                        cursor: refreshing ? 'not-allowed' : 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {refreshing ? '↻ Polling...' : '↻ Refresh Now'}
                                </button>
                            </div>
                            <div className={styles.gaugesGrid}>
                                {credits.map(g => {
                                    const pct = parseFloat(g.percentage);
                                    const color = gaugeColor(pct);
                                    return (
                                        <article key={g.service} className={styles.gaugeCard} aria-label={`${g.service} usage gauge`}>
                                            <div className={styles.gaugeHeader}>
                                                <span className={styles.serviceName}>{g.service}</span>
                                                <span className={styles.gaugePercent} style={{ color }}>
                                                    {g.percentage}%
                                                </span>
                                            </div>
                                            <div className={styles.gaugeTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                                <div
                                                    className={styles.gaugeFill}
                                                    style={{
                                                        width: `${Math.min(pct, 100)}%`,
                                                        background: `linear-gradient(90deg, ${color}88, ${color})`,
                                                        boxShadow: pct >= WARN_THRESHOLD ? `0 0 8px ${color}66` : 'none',
                                                    }}
                                                />
                                            </div>
                                            <div className={styles.gaugeFooter}>
                                                <span>{g.used.toLocaleString()} used</span>
                                                <span>/ {g.limit.toLocaleString()} limit</span>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

function KPICard({ id, label, value, icon, sub, color }: {
    id: string; label: string; value: string; icon: React.ReactNode; sub?: string; color: string;
}) {
    return (
        <article id={id} className={styles.kpiCard} style={{ borderTopColor: color }}>
            <div className={styles.kpiHeader}>
                <span className={styles.kpiIcon} style={{ color }} aria-hidden="true">{icon}</span>
                <span className={styles.kpiLabel}>{label}</span>
            </div>
            <div className={styles.kpiValue}>{value}</div>
            {sub && <div className={styles.kpiSub}>{sub}</div>}
        </article>
    );
}
