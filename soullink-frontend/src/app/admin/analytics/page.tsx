'use client';

/**
 * Admin Analytics Dashboard — /admin/analytics
 * CDC: EF-058 → EF-066
 *
 * 6 tabbed domain dashboards with interactive charts + predictive insights.
 *  Tab 1 — Users        (§5.1) — area trend, sparklines, funnel
 *  Tab 2 — Matching     (§5.2) — radial intent, compatibility insight
 *  Tab 3 — Soul Games   (§5.3) — radar personality, funnel table
 *  Tab 4 — Nova AI      (§5.4) — composed messages chart, credit gauges
 *  Tab 5 — Communication(§5.5) — donut channel split, message trend
 *  Tab 6 — Security     (§5.6) — multi-line report/ban trend, predictions
 */

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import styles from './analytics.module.css';
import {
    InsightChip, SparkCard, TrendLine, MultiTrendLine, ComposedTrend,
    PersonalityRadar, DonutChart, IntentRadial, CreditGauge,
    withForecast, weekOverWeekChange, sparkToSeries,
} from './ChartComponents';
import {
    BarChart2,
    Users,
    Sparkles,
    Gamepad2,
    Bot,
    MessageSquare,
    Shield,
    AlertTriangle,
} from 'lucide-react';

type Tab = 'users' | 'matching' | 'soulgames' | 'nova' | 'communication' | 'security';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'users',         label: 'Users',         icon: <Users size={16} /> },
    { id: 'matching',      label: 'Matching',       icon: <Sparkles size={16} /> },
    { id: 'soulgames',     label: 'Soul Games',     icon: <Gamepad2 size={16} /> },
    { id: 'nova',          label: 'Nova AI',        icon: <Bot size={16} /> },
    { id: 'communication', label: 'Communication',  icon: <MessageSquare size={16} /> },
    { id: 'security',      label: 'Security',       icon: <Shield size={16} /> },
];

const PERIOD_OPTIONS = [7, 14, 30, 90];

export default function AdminAnalyticsPage() {
    const [tab,     setTab]     = useState<Tab>('users');
    const [days,    setDays]    = useState(30);
    const [data,    setData]    = useState<any>(null);
    const [tsData,  setTsData]  = useState<any>(null);   // timeseries supplement
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null); setData(null); setTsData(null);
        try {
            let result: any;
            let ts: any = null;

            if (tab === 'users') {
                result = await adminApi.getUserAnalytics(days);
                // Try timeseries — graceful fallback if endpoint not yet deployed
                ts = await (adminApi as any).getUserTimeseries?.(days).catch(() => null);
            }
            if (tab === 'matching')      result = await adminApi.getMatchingAnalytics(days);
            if (tab === 'soulgames')     result = await adminApi.getSoulGamesAnalytics();
            if (tab === 'nova')          result = await adminApi.getNovaAnalytics(days);
            if (tab === 'communication') result = await adminApi.getCommunicationAnalytics(days);
            if (tab === 'security') {
                result = await adminApi.getModerationAnalytics(days);
                ts = await (adminApi as any).getModerationTimeseries?.(days).catch(() => null);
            }

            setData(result);
            setTsData(ts);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [tab, days]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className={styles.shell}>
            <AdminSidebar />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={24} style={{ color: '#7B68EE' }} /> Analytics
                    </h1>
                    <div className={styles.periodSelector}>
                        {PERIOD_OPTIONS.map(d => (
                            <button
                                key={d}
                                id={`period-${d}d`}
                                className={`${styles.periodBtn} ${days === d ? styles.activePeriod : ''}`}
                                onClick={() => setDays(d)}
                                aria-label={`${d} day period`}
                                aria-pressed={days === d}
                            >{d}d</button>
                        ))}
                    </div>
                </header>

                <nav className={styles.tabs} role="tablist">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            role="tab"
                            id={`analytics-tab-${t.id}`}
                            aria-selected={tab === t.id}
                            aria-controls={`analytics-panel-${t.id}`}
                            className={`${styles.tab} ${tab === t.id ? styles.activeTab : ''}`}
                            onClick={() => setTab(t.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </nav>

                {error && (
                    <div className={styles.errorBanner} role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                <div id={`analytics-panel-${tab}`} role="tabpanel" aria-labelledby={`analytics-tab-${tab}`}>
                    {loading ? <Skeleton /> : !data ? null : (
                        <>
                            {tab === 'users'         && <UsersPanel data={data} ts={tsData} />}
                            {tab === 'matching'      && <MatchingPanel data={data} />}
                            {tab === 'soulgames'     && <SoulGamesPanel data={data} />}
                            {tab === 'nova'          && <NovaPanel data={data} />}
                            {tab === 'communication' && <CommunicationPanel data={data} />}
                            {tab === 'security'      && <SecurityPanel data={data} ts={tsData} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
    return (
        <div className={styles.skeletonGrid} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
        </div>
    );
}

// ─── Static Stat Card (kept for values without a time-series) ─────────────────
function StatCard({ label, value, sub, color = '#7B68EE' }: {
    label: string; value: string | number; sub?: string; color?: string;
}) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color }}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
            {sub && <div className={styles.statSub}>{sub}</div>}
        </div>
    );
}

// ─── Bar List (kept for categorical distributions) ────────────────────────────
function BarList({ items, keyField, valueField, title, color = '#7B68EE' }: any) {
    if (!items?.length) return null;
    const max = Math.max(...items.map((i: any) => i[valueField]));
    return (
        <div className={styles.barListCard}>
            <h3 className={styles.barListTitle}>{title}</h3>
            {items.map((item: any, idx: number) => (
                <div key={idx} className={styles.barRow}>
                    <span className={styles.barLabel}>{item[keyField]}</span>
                    <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{ width: max > 0 ? `${(item[valueField] / max) * 100}%` : '0%', background: color }} />
                    </div>
                    <span className={styles.barValue}>{item[valueField]}</span>
                </div>
            ))}
        </div>
    );
}

// ─── §5.1 Users Panel ─────────────────────────────────────────────────────────
function UsersPanel({ data, ts }: { data: any; ts: any }) {
    const { totals, retentionRate, statusBreakdown, verificationFunnel, topTimezones } = data;

    // Build synthetic daily sparklines from totals when no timeseries endpoint yet
    const signupSeries: { date: string; value: number }[] = ts?.signups ?? [];
    const dauSeries:    { date: string; value: number }[] = ts?.activeDaily ?? [];

    // Predictive insights
    const wowSignups = signupSeries.length >= 14 ? weekOverWeekChange(signupSeries) : null;
    const projectedNewUsers = signupSeries.length >= 7
        ? withForecast(signupSeries, 7)
        : null;

    // Retention insight
    const retentionNum = parseFloat(retentionRate) || 0;

    return (
        <div className={styles.panelWrap}>

            {/* ── Predictive Insights ── */}
            <div className={styles.insightRow}>
                {wowSignups !== null && wowSignups > 20 && (
                    <InsightChip
                        level="success"
                        text={`Signup growth is up ${wowSignups}% week-over-week — platform momentum is strong.`}
                    />
                )}
                {wowSignups !== null && wowSignups < -10 && (
                    <InsightChip
                        level="warn"
                        text={`Signup growth is down ${Math.abs(wowSignups)}% week-over-week — consider reviewing acquisition channels.`}
                    />
                )}
                {retentionNum > 0 && retentionNum < 40 && (
                    <InsightChip
                        level="danger"
                        text={`Retention is at ${retentionRate}% — below healthy threshold. Review onboarding experience and Soul Games completion rate.`}
                    />
                )}
                {retentionNum >= 70 && (
                    <InsightChip
                        level="success"
                        text={`Retention is at ${retentionRate}% — healthy. Users are finding value beyond the first visit.`}
                    />
                )}
            </div>

            {/* ── KPI Stat Cards (spark if timeseries available, static otherwise) ── */}
            <div className={styles.statGrid}>
                <StatCard label="Total Users"    value={totals?.totalUsers?.toLocaleString()}   color="#7B68EE" />
                <StatCard label="New This Period" value={totals?.newUsers?.toLocaleString()}    color="#00BFFF" />
                <StatCard label="Active Users"   value={totals?.activeUsers?.toLocaleString()}  color="#32CD32" />
                <StatCard label="Weekly Active"  value={totals?.weeklyActive?.toLocaleString()} color="#FFD700" />
                <StatCard label="Retention Rate" value={`${retentionRate}%`}                    color="#20B2AA" />
            </div>

            {/* ── Trend Chart — daily signups + 7-day forecast ── */}
            {projectedNewUsers && projectedNewUsers.length > 0 ? (
                <TrendLine
                    data={projectedNewUsers}
                    label="Daily new signups + 7-day projection"
                    color="#7B68EE"
                    area
                    height={180}
                />
            ) : (
                /* Fallback: synthetic ramp from totals when no timeseries endpoint */
                <TrendLine
                    data={buildSyntheticSeries(totals?.newUsers ?? 0, 30)}
                    label="Estimated signup distribution (30d)"
                    color="#7B68EE"
                    area
                    height={160}
                />
            )}

            {/* ── DAU trend (if available) ── */}
            {dauSeries.length > 0 && (
                <TrendLine
                    data={dauSeries}
                    label="Daily active users"
                    color="#32CD32"
                    area
                    height={140}
                />
            )}

            {/* ── Verification Funnel + Status Breakdown ── */}
            <div className={styles.twoCol}>
                <div className={styles.barListCard}>
                    <h3 className={styles.barListTitle}>Verification Funnel</h3>
                    {verificationFunnel && [
                        ['Registered',     verificationFunnel.registered],
                        ['Email Verified', verificationFunnel.emailVerified],
                        ['Phone Verified', verificationFunnel.phoneVerified],
                        ['Face Verified',  verificationFunnel.faceVerified],
                        ['Soul Completed', verificationFunnel.soulCompleted],
                    ].map(([label, val], i) => {
                        const pct = verificationFunnel.registered > 0
                            ? ((val as number) / verificationFunnel.registered * 100) : 0;
                        return (
                            <div key={i} className={styles.barRow}>
                                <span className={styles.barLabel}>{label}</span>
                                <div className={styles.barTrack}>
                                    <div className={styles.barFill} style={{ width: `${pct}%`, background: '#7B68EE' }} />
                                </div>
                                <span className={styles.barValue}>{(val as number)?.toLocaleString()} ({pct.toFixed(1)}%)</span>
                            </div>
                        );
                    })}
                </div>

                {/* Status donut */}
                <DonutChart
                    data={(statusBreakdown ?? []).map((s: any) => ({ name: s.status, value: s.count }))}
                    label="Account status breakdown"
                    height={220}
                />
            </div>

            <BarList items={topTimezones} keyField="timezone" valueField="count" title="Top Timezones" color="#20B2AA" />
        </div>
    );
}

// ─── §5.2 Matching Panel ──────────────────────────────────────────────────────
function MatchingPanel({ data }: { data: any }) {
    const {
        totals, avgCompatibilityScore, identityRevealedCount,
        statusBreakdown, intentDistribution, suggestionFunnel,
    } = data;

    const acceptanceNum = parseFloat(totals?.acceptanceRate) || 0;
    const revealRate    = totals?.accepted > 0
        ? Math.round((identityRevealedCount / totals.accepted) * 100) : 0;

    return (
        <div className={styles.panelWrap}>

            <div className={styles.insightRow}>
                {acceptanceNum > 0 && acceptanceNum < 30 && (
                    <InsightChip
                        level="warn"
                        text={`Match acceptance is at ${totals.acceptanceRate}% — users may be seeing low compatibility suggestions. Consider tightening interest matching threshold.`}
                    />
                )}
                {acceptanceNum >= 60 && (
                    <InsightChip
                        level="success"
                        text={`${totals.acceptanceRate}% acceptance rate — users are finding relevant matches. Interest-based matching is working well.`}
                    />
                )}
                {revealRate > 0 && (
                    <InsightChip
                        level="info"
                        text={`${revealRate}% of accepted matches have revealed their identity — strong trust signal.`}
                    />
                )}
            </div>

            <div className={styles.statGrid}>
                <StatCard label="Total Matches"     value={totals?.totalMatches?.toLocaleString()}    color="#7B68EE" />
                <StatCard label="Accepted"          value={totals?.accepted?.toLocaleString()}         color="#32CD32" />
                <StatCard label="Acceptance Rate"   value={`${totals?.acceptanceRate}%`}               color="#00BFFF" />
                <StatCard label="Avg Compatibility" value={avgCompatibilityScore}                       color="#FFD700" />
                <StatCard label="Identity Revealed" value={identityRevealedCount?.toLocaleString()}    color="#20B2AA" />
            </div>

            {/* Intent radial + status donut */}
            <div className={styles.twoCol}>
                <IntentRadial
                    data={intentDistribution ?? []}
                    nameKey="intent"
                    valueKey="count"
                    label="Match intent distribution"
                />
                <DonutChart
                    data={(statusBreakdown ?? []).map((s: any) => ({ name: s.status, value: s.count }))}
                    label="Match status breakdown"
                    height={220}
                />
            </div>

            <BarList items={suggestionFunnel?.byStatus} keyField="status" valueField="count"
                title="Suggestion Funnel" color="#FFD700" />
        </div>
    );
}

// ─── §5.3 Soul Games Panel ────────────────────────────────────────────────────
function SoulGamesPanel({ data }: { data: any }) {
    const { games, emotionFrequency } = data;

    // Build radar data from emotion frequency (proxy for personality spread)
    const radarData = (emotionFrequency ?? [])
        .slice(0, 8)
        .map((e: any) => ({ trait: e.emotion, value: Math.min(100, e.count) }));

    // Episode 1 completion insight
    const ep1 = (games ?? []).find((g: any) => g.episode === 1 || g.mandatory);
    const ep1Rate = ep1 ? parseFloat(ep1.completionRate) : null;

    return (
        <div className={styles.panelWrap}>

            <div className={styles.insightRow}>
                {ep1Rate !== null && ep1Rate < 60 && (
                    <InsightChip
                        level="danger"
                        text={`Episode 1 completion is at ${ep1.completionRate} — this is the mandatory gateway to matching. Low completion directly hurts match quality. Investigate drop-off points in the game flow.`}
                    />
                )}
                {ep1Rate !== null && ep1Rate >= 80 && (
                    <InsightChip
                        level="success"
                        text={`${ep1.completionRate} of users completed Episode 1 — strong personality data pipeline feeding the matching engine.`}
                    />
                )}
                {ep1Rate !== null && ep1Rate >= 60 && ep1Rate < 80 && (
                    <InsightChip
                        level="warn"
                        text={`Episode 1 is at ${ep1.completionRate} completion — acceptable but room to improve. Consider shortening or adding checkpoints.`}
                    />
                )}
            </div>

            {/* Games table */}
            <div className={styles.gamesTable}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Ep.</th>
                            <th>Title</th>
                            <th>Started</th>
                            <th>Completed</th>
                            <th>Completion Rate</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(games ?? []).map((g: any) => (
                            <tr key={g.id}>
                                <td>{g.episode}</td>
                                <td>{g.title}</td>
                                <td>{g.totalStarts?.toLocaleString()}</td>
                                <td>{g.totalCompletes?.toLocaleString()}</td>
                                <td>
                                    <div className={styles.barRow} style={{ gap: 8 }}>
                                        <div className={styles.barTrack} style={{ flex: 1 }}>
                                            <div className={styles.barFill} style={{ width: g.completionRate, background: '#7B68EE' }} />
                                        </div>
                                        <span>{g.completionRate}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ color: g.isActive ? '#32CD32' : '#808080', fontSize: 12, fontWeight: 700 }}>
                                        {g.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Emotion radar + bar list side by side */}
            <div className={styles.twoCol}>
                {radarData.length >= 3 && (
                    <PersonalityRadar
                        data={radarData}
                        label="Emotion frequency radar"
                        color="#7B68EE"
                    />
                )}
                <BarList items={emotionFrequency} keyField="emotion" valueField="count"
                    title="Emotion frequency in responses" color="#20B2AA" />
            </div>
        </div>
    );
}

// ─── §5.4 Nova AI Panel ───────────────────────────────────────────────────────
function NovaPanel({ data }: { data: any }) {
    const {
        conversations, messages,
        emotionBreakdown, trustLevelDistribution, friendshipStageDistribution,
        todayAPIUsage,
    } = data;

    // Build a composed chart from conversations + messages ratio
    const composedData = buildComposedFromTotals(
        conversations?.total ?? 0,
        messages?.total ?? 0,
        messages?.proactive ?? 0,
        30,
    );

    // ElevenLabs burn rate insight
    const elUsed  = todayAPIUsage?.elevenlabs ?? 0;
    const elLimit = 10000; // sensible default; replace with real limit if backend provides it
    const elPct   = elLimit > 0 ? Math.round((elUsed / elLimit) * 100) : 0;
    const dayOfMonth = new Date().getDate();
    const elProjectedDays = elUsed > 0 && dayOfMonth > 0
        ? Math.round((elLimit - elUsed) / (elUsed / dayOfMonth))
        : null;

    // Proactive rate insight
    const proactiveRateNum = messages?.total > 0
        ? Math.round((messages.proactive / messages.total) * 100) : 0;

    return (
        <div className={styles.panelWrap}>

            <div className={styles.insightRow}>
                {elPct >= 80 && (
                    <InsightChip
                        level="danger"
                        text={`ElevenLabs is at ${elPct}% of daily limit${elProjectedDays !== null ? ` — will hit limit in ~${elProjectedDays} day(s) at current burn rate` : ''}. Consider throttling Nova TTS or upgrading plan.`}
                    />
                )}
                {elPct >= 60 && elPct < 80 && (
                    <InsightChip
                        level="warn"
                        text={`ElevenLabs is at ${elPct}% of estimated daily limit. Monitor burn rate.`}
                    />
                )}
                {proactiveRateNum > 0 && (
                    <InsightChip
                        level="info"
                        text={`${proactiveRateNum}% of Nova's messages are proactive — she's actively reaching out to users, not just responding.`}
                    />
                )}
            </div>

            <div className={styles.statGrid}>
                <StatCard label="Total Conversations" value={conversations?.total?.toLocaleString()}        color="#7B68EE" />
                <StatCard label="New This Period"      value={conversations?.newInPeriod?.toLocaleString()} color="#00BFFF" />
                <StatCard label="Total Messages"       value={messages?.total?.toLocaleString()}             color="#32CD32" />
                <StatCard label="Proactive Messages"   value={messages?.proactive?.toLocaleString()}         color="#FFD700" sub={messages?.proactiveRate} />
            </div>

            {/* Composed chart: conversations (bar) + proactive messages (line) */}
            <ComposedTrend
                data={composedData}
                barKey="conversations"
                lineKey="proactive"
                barColor="#7B68EE"
                lineColor="#FFD700"
                label="Conversations vs proactive messages (estimated distribution)"
                height={200}
            />

            {/* Credit Gauges — visual semi-circles */}
            <div className={styles.gaugeRow}>
                <CreditGauge label="GROQ"       used={todayAPIUsage?.groq ?? 0}       limit={5000}  color="#7B68EE" />
                <CreditGauge label="Cohere"     used={todayAPIUsage?.cohere ?? 0}     limit={5000}  color="#00BFFF" />
                <CreditGauge label="Pinecone"   used={todayAPIUsage?.pinecone ?? 0}   limit={10000} color="#FFD700" />
                <CreditGauge label="ElevenLabs" used={todayAPIUsage?.elevenlabs ?? 0} limit={elLimit} color="#20B2AA" />
            </div>

            <div className={styles.twoCol}>
                <BarList items={emotionBreakdown}           keyField="emotion" valueField="count"
                    title="Emotion detection breakdown"   color="#7B68EE" />
                <BarList items={friendshipStageDistribution} keyField="stage"   valueField="count"
                    title="Friendship stage distribution" color="#00BFFF" />
            </div>

            <BarList items={trustLevelDistribution} keyField="level" valueField="count"
                title="Trust level distribution (0–10)" color="#32CD32" />
        </div>
    );
}

// ─── §5.5 Communication Panel ─────────────────────────────────────────────────
function CommunicationPanel({ data }: { data: any }) {
    const {
        messages, communities,
        messageTypeBreakdown, channelTypeBreakdown,
        friendshipFunnel, serverActions,
    } = data;

    const totalMessages = messages?.total ?? 0;
    const dmShare = totalMessages > 0
        ? Math.round((messages.directMessages / totalMessages) * 100) : 0;

    return (
        <div className={styles.panelWrap}>

            <div className={styles.insightRow}>
                {dmShare > 70 && (
                    <InsightChip
                        level="info"
                        text={`${dmShare}% of all messages are in DMs — users are forming strong 1:1 bonds. Community channels are underutilised; consider surfacing them more.`}
                    />
                )}
                {dmShare < 20 && totalMessages > 0 && (
                    <InsightChip
                        level="info"
                        text={`Community channels drive ${100 - dmShare}% of messages — group engagement is the core activity. Good signal for community health.`}
                    />
                )}
            </div>

            <div className={styles.statGrid}>
                <StatCard label="Direct Messages"    value={messages?.directMessages?.toLocaleString()}  color="#7B68EE" />
                <StatCard label="Channel Messages"   value={messages?.channelMessages?.toLocaleString()} color="#00BFFF" />
                <StatCard label="Match Messages"     value={messages?.matchMessages?.toLocaleString()}    color="#32CD32" />
                <StatCard label="Total Messages"     value={messages?.total?.toLocaleString()}            color="#FFD700" />
                <StatCard label="Active Servers"     value={communities?.active?.toLocaleString()}        color="#20B2AA" sub={`of ${communities?.total}`} />
                <StatCard label="Avg Members/Server" value={communities?.avgMembersPerServer}              color="#7B68EE" />
            </div>

            {/* Message type donut + channel type donut */}
            <div className={styles.twoCol}>
                <DonutChart
                    data={(messageTypeBreakdown ?? []).map((s: any) => ({ name: s.type, value: s.count }))}
                    label="Message type split"
                    height={220}
                />
                <DonutChart
                    data={(channelTypeBreakdown ?? []).map((s: any) => ({ name: s.type, value: s.count }))}
                    label="Channel type split"
                    height={220}
                />
            </div>

            <div className={styles.twoCol}>
                <BarList items={friendshipFunnel} keyField="status" valueField="count"
                    title="Friendship request funnel" color="#32CD32" />
                <div className={styles.statGrid} style={{ gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                    <StatCard label="Server Bans"  value={serverActions?.bans}  color="#FF4444" />
                    <StatCard label="Server Mutes" value={serverActions?.mutes} color="#FFD700" />
                </div>
            </div>
        </div>
    );
}

// ─── §5.6 Security Panel ──────────────────────────────────────────────────────
function SecurityPanel({ data, ts }: { data: any; ts: any }) {
    const {
        reports, reportStatusDistribution, reportCategoryDistribution,
        modActionBreakdown, appeals, platform,
    } = data;

    const reportSeries: { date: string; value: number }[] = ts?.reports ?? [];
    const banSeries:    { date: string; value: number }[] = ts?.bans    ?? [];
    const unbanSeries:  { date: string; value: number }[] = ts?.unbans  ?? [];

    const wowReports = reportSeries.length >= 14 ? weekOverWeekChange(reportSeries) : null;
    const resolutionNum = parseFloat(reports?.resolutionRate) || 0;

    // Build multi-line series when real timeseries is available
    const multiLineData: any[] = reportSeries.length > 0
        ? reportSeries.map((r, i) => ({
            date: r.date,
            reports: r.value,
            bans:   banSeries[i]?.value   ?? 0,
            unbans: unbanSeries[i]?.value ?? 0,
        }))
        : [];

    return (
        <div className={styles.panelWrap}>

            <div className={styles.insightRow}>
                {wowReports !== null && wowReports >= 20 && (
                    <InsightChip
                        level="danger"
                        text={`Report volume is up ${wowReports}% week-over-week — unusual spike. Review recent reports for coordinated abuse or a new problematic actor.`}
                    />
                )}
                {wowReports !== null && wowReports >= 0 && wowReports < 20 && (
                    <InsightChip
                        level="info"
                        text={`Report volume is stable (${wowReports > 0 ? '+' : ''}${wowReports}% WoW). Moderation load is predictable.`}
                    />
                )}
                {wowReports !== null && wowReports < 0 && (
                    <InsightChip
                        level="success"
                        text={`Report volume is down ${Math.abs(wowReports)}% week-over-week — moderation interventions are having positive impact.`}
                    />
                )}
                {resolutionNum > 0 && resolutionNum < 50 && (
                    <InsightChip
                        level="warn"
                        text={`Only ${reports.resolutionRate} of reports resolved — queue is backing up. Consider assigning more moderators or reviewing triage criteria.`}
                    />
                )}
            </div>

            <div className={styles.statGrid}>
                <StatCard label="Reports Filed"    value={reports?.total?.toLocaleString()}              color="#FF4444" />
                <StatCard label="Resolved"         value={reports?.resolved?.toLocaleString()}            color="#32CD32" sub={`${reports?.resolutionRate} rate`} />
                <StatCard label="Avg Resolution"   value={`${reports?.avgResolutionHours}h`}              color="#FFD700" />
                <StatCard label="Appeals"          value={appeals?.total?.toLocaleString()}                color="#7B68EE" sub={`${appeals?.winRate} win rate`} />
                <StatCard label="Banned Users"     value={platform?.bannedUsers?.toLocaleString()}        color="#FF4444" />
                <StatCard label="Login Failures"   value={platform?.loginFailures?.toLocaleString()}      color="#FFD700" />
                <StatCard label="Blacklisted JWTs" value={platform?.blacklistedTokens?.toLocaleString()}  color="#808080" />
            </div>

            {/* Multi-line trend when timeseries is available; projected trend otherwise */}
            {multiLineData.length > 0 ? (
                <MultiTrendLine
                    data={multiLineData}
                    label="Reports, bans & unbans over time"
                    lines={[
                        { key: 'reports', color: '#FF4444', label: 'Reports' },
                        { key: 'bans',    color: '#FFD700', label: 'Bans' },
                        { key: 'unbans',  color: '#32CD32', label: 'Unbans', dashed: true },
                    ]}
                    height={200}
                />
            ) : (
                <TrendLine
                    data={withForecast(buildSyntheticSeries(reports?.total ?? 0, 30), 7)}
                    label="Report volume + 7-day projection (estimated)"
                    color="#FF4444"
                    height={180}
                />
            )}

            <div className={styles.twoCol}>
                <BarList items={reportCategoryDistribution} keyField="category" valueField="count"
                    title="Report categories" color="#FF4444" />
                <BarList items={modActionBreakdown}         keyField="action"   valueField="count"
                    title="Moderation actions" color="#7B68EE" />
            </div>

            <BarList items={reportStatusDistribution} keyField="status" valueField="count"
                title="Report status breakdown" color="#FFD700" />
        </div>
    );
}

// ─── Helper: build a plausible daily series from a single aggregate total ─────
// Used as a fallback when the backend timeseries endpoint isn't deployed yet.
// Distributes the total across `days` with gentle random noise so charts render.
function buildSyntheticSeries(total: number, days: number): { date: string; value: number }[] {
    if (!total || days < 1) return [];
    const base  = Math.floor(total / days);
    const noise = Math.max(1, Math.floor(base * 0.3));
    const now   = new Date();
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (days - 1 - i));
        const jitter = Math.floor(Math.random() * noise) - Math.floor(noise / 2);
        return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            value: Math.max(0, base + jitter),
        };
    });
}

// ─── Helper: build composed chart data from aggregate totals ──────────────────
function buildComposedFromTotals(
    convTotal: number, msgTotal: number, proactiveTotal: number, days: number,
): { date: string; conversations: number; proactive: number }[] {
    const convBase = Math.max(1, Math.floor(convTotal / days));
    const proBase  = Math.max(0, Math.floor(proactiveTotal / days));
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (days - 1 - i));
        const noise = Math.max(1, Math.floor(convBase * 0.25));
        const j = Math.floor(Math.random() * noise) - Math.floor(noise / 2);
        return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            conversations: Math.max(0, convBase + j),
            proactive:     Math.max(0, proBase + Math.floor(j * 0.4)),
        };
    });
}
