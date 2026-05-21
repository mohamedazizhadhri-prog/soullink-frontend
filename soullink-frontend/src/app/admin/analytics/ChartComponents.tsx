'use client';

/**
 * ChartComponents.tsx
 * Shared chart primitives for the SoulLink analytics dashboard.
 * All charts are dark-themed to match analytics.module.css.
 * Uses recharts (already installed in package.json).
 */

import {
    LineChart, Line,
    AreaChart, Area,
    BarChart, Bar,
    ComposedChart,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    RadialBarChart, RadialBar,
    PieChart, Pie, Cell,
    XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Design tokens (match existing dark dashboard palette) ───────────────────
const C = {
    purple:  '#7B68EE',
    teal:    '#1D9E75',
    amber:   '#BA7517',
    pink:    '#D4537E',
    blue:    '#378ADD',
    redSoft: '#FF4444',
    gold:    '#FFD700',
    cyan:    '#00BFFF',
    green:   '#32CD32',
};

const CARD: React.CSSProperties = {
    background: '#13131F',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: '16px 18px',
};

const GRID_COLOR = 'rgba(255,255,255,0.05)';
const AXIS_TICK  = { fill: '#A0A0B5', fontSize: 10 };
const TOOLTIP_STYLE: React.CSSProperties = {
    background: '#0E0E1A',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#F0F0F5',
    fontSize: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};
const LABEL_STYLE: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#A0A0B5',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 12,
};

const PALETTE = [C.purple, C.teal, C.amber, C.pink, C.blue, C.redSoft, C.cyan, C.green];

// ─── Insight Chip ─────────────────────────────────────────────────────────────
type InsightLevel = 'info' | 'warn' | 'danger' | 'success';

export function InsightChip({ text, level = 'info' }: { text: string; level?: InsightLevel }) {
    const map = {
        info:    { bg: 'rgba(123,104,238,0.12)', border: 'rgba(123,104,238,0.35)', color: '#C4B8FF' },
        warn:    { bg: 'rgba(186,117,23,0.14)',  border: 'rgba(186,117,23,0.35)',  color: '#F0C070' },
        danger:  { bg: 'rgba(255,68,68,0.12)',   border: 'rgba(255,68,68,0.3)',    color: '#FF8888' },
        success: { bg: 'rgba(29,158,117,0.12)',  border: 'rgba(29,158,117,0.35)', color: '#6ADBB5' },
    };
    const s = map[level];
    return (
        <div style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 10, padding: '10px 14px',
            fontSize: 13, color: s.color, lineHeight: 1.55,
        }}>
            {text}
        </div>
    );
}

// ─── Spark Card ───────────────────────────────────────────────────────────────
export function SparkCard({
    label, value, spark = [], color = C.purple, sub,
}: {
    label: string; value: string | number;
    spark?: number[]; color?: string; sub?: string;
}) {
    const trend = spark.length > 1 ? spark[spark.length - 1] - spark[0] : 0;
    const trendStr = trend > 0 ? `+${trend}` : `${trend}`;
    const trendColor = trend > 0 ? '#1D9E75' : trend < 0 ? '#FF4444' : '#A0A0B5';
    const sparkData = spark.map((v) => ({ v }));

    return (
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                {trend !== 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: trendColor }}>{trendStr}</span>
                )}
            </div>
            <span style={{ fontSize: 11, color: '#A0A0B5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {label}
            </span>
            {sub && <span style={{ fontSize: 12, color: '#A0A0B5' }}>{sub}</span>}
            {sparkData.length > 1 && (
                <ResponsiveContainer width="100%" height={36}>
                    <LineChart data={sparkData}>
                        <Line dataKey="v" stroke={color} strokeWidth={1.5} dot={false} strokeOpacity={0.7} />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

// ─── Trend Line / Area Chart ──────────────────────────────────────────────────
// data shape: Array<{ date: string; value?: number; forecast?: number }>
export function TrendLine({
    data, dataKey = 'value', forecastKey = 'forecast',
    color = C.purple, label, area = false, height = 160,
}: {
    data: any[]; dataKey?: string; forecastKey?: string;
    color?: string; label?: string; area?: boolean; height?: number;
}) {
    const hasForecast = data.some((d: any) => d[forecastKey] != null);
    const Chart: any  = area ? AreaChart : LineChart;

    return (
        <div style={CARD}>
            {label && <p style={LABEL_STYLE}>{label}</p>}
            <ResponsiveContainer width="100%" height={height}>
                <Chart data={data}>
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    {area ? (
                        <Area type="monotone" dataKey={dataKey} stroke={color} fill={color}
                            fillOpacity={0.1} strokeWidth={2} dot={false} connectNulls={false} />
                    ) : (
                        <Line type="monotone" dataKey={dataKey} stroke={color}
                            strokeWidth={2} dot={false} connectNulls={false} />
                    )}
                    {hasForecast && (
                        <Line type="monotone" dataKey={forecastKey} stroke={color}
                            strokeWidth={2} strokeDasharray="5 4" dot={false}
                            strokeOpacity={0.55} connectNulls={false} />
                    )}
                </Chart>
            </ResponsiveContainer>
            {hasForecast && (
                <p style={{ fontSize: 11, color: '#A0A0B5', marginTop: 6 }}>
                    — actual &nbsp;&nbsp; - - - 7-day projection
                </p>
            )}
        </div>
    );
}

// ─── Multi-line Trend ─────────────────────────────────────────────────────────
export function MultiTrendLine({
    data, lines, label, height = 160,
}: {
    data: any[];
    lines: { key: string; color: string; label: string; dashed?: boolean }[];
    label?: string; height?: number;
}) {
    return (
        <div style={CARD}>
            {label && <p style={LABEL_STYLE}>{label}</p>}
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data}>
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#A0A0B5', paddingTop: 8 }}
                        formatter={(v: string) => lines.find(l => l.key === v)?.label ?? v} />
                    {lines.map(l => (
                        <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color}
                            strokeWidth={2} strokeDasharray={l.dashed ? '5 4' : undefined}
                            dot={false} name={l.key} />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Composed Chart (Bar + Line) ─────────────────────────────────────────────
export function ComposedTrend({
    data, barKey, lineKey,
    barColor = C.purple, lineColor = C.teal,
    label, height = 180,
}: {
    data: any[]; barKey: string; lineKey: string;
    barColor?: string; lineColor?: string; label?: string; height?: number;
}) {
    return (
        <div style={CARD}>
            {label && <p style={LABEL_STYLE}>{label}</p>}
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={data}>
                    <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#A0A0B5', paddingTop: 8 }} />
                    <Bar dataKey={barKey} fill={barColor} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey={lineKey} stroke={lineColor} strokeWidth={2} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Personality Radar ────────────────────────────────────────────────────────
// data: Array<{ trait: string; value: number }>
export function PersonalityRadar({
    data, label, color = C.purple,
}: {
    data: any[]; label?: string; color?: string;
}) {
    return (
        <div style={CARD}>
            {label && <p style={LABEL_STYLE}>{label}</p>}
            <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={data} cx="50%" cy="50%">
                    <PolarGrid stroke={GRID_COLOR} />
                    <PolarAngleAxis dataKey="trait" tick={{ fill: '#A0A0B5', fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]}
                        tick={{ fill: '#A0A0B5', fontSize: 9 }} axisLine={false} />
                    <Radar dataKey="value" stroke={color} fill={color}
                        fillOpacity={0.18} strokeWidth={2} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
export function DonutChart({
    data, nameKey = 'name', valueKey = 'value', label, height = 220,
}: {
    data: any[]; nameKey?: string; valueKey?: string; label?: string; height?: number;
}) {
    if (!data?.length) return null;
    return (
        <div style={CARD}>
            {label && <p style={LABEL_STYLE}>{label}</p>}
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie data={data} dataKey={valueKey} nameKey={nameKey}
                        cx="50%" cy="50%" innerRadius="52%" outerRadius="72%" paddingAngle={2}>
                        {data.map((_: any, i: number) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#A0A0B5' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Radial Bar (intent / category ring) ─────────────────────────────────────
export function IntentRadial({
    data, nameKey = 'intent', valueKey = 'count', label,
}: {
    data: any[]; nameKey?: string; valueKey?: string; label?: string;
}) {
    if (!data?.length) return null;
    const max = Math.max(...data.map((d: any) => d[valueKey]));
    const normalized = data.map((d: any, i: number) => ({
        name: d[nameKey],
        value: max > 0 ? Math.round((d[valueKey] / max) * 100) : 0,
        fill: PALETTE[i % PALETTE.length],
    }));
    return (
        <div style={CARD}>
            {label && <p style={LABEL_STYLE}>{label}</p>}
            <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart data={normalized} innerRadius="20%" outerRadius="80%"
                    barSize={14} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={6} label={false}
                        background={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                        formatter={(_v: any, _n: any, props: any) => [props.payload.name, '']} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#A0A0B5' }}
                        formatter={(_: any, entry: any) => entry.payload?.name ?? ''} />
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Credit Gauge (semi-circular) ─────────────────────────────────────────────
export function CreditGauge({
    label, used, limit, color = C.purple,
}: {
    label: string; used: number; limit: number; color?: string;
}) {
    const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
    const gaugeColor = pct >= 80 ? C.redSoft : pct >= 60 ? C.gold : color;
    const pieData = [{ value: pct }, { value: 100 - pct }];
    return (
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 130 }}>
            <div style={{ position: 'relative', width: 100, height: 56 }}>
                <PieChart width={100} height={100} style={{ position: 'absolute', top: -44 }}>
                    <Pie data={pieData} dataKey="value" cx={50} cy={100}
                        startAngle={180} endAngle={0}
                        innerRadius={30} outerRadius={44} paddingAngle={0} stroke="none">
                        <Cell fill={gaugeColor} opacity={0.9} />
                        <Cell fill="rgba(255,255,255,0.05)" />
                    </Pie>
                </PieChart>
                <span style={{
                    position: 'absolute', bottom: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 15, fontWeight: 700, color: gaugeColor,
                    fontVariantNumeric: 'tabular-nums',
                }}>{pct}%</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#A0A0B5', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, textAlign: 'center' }}>
                {label}
            </span>
            <span style={{ fontSize: 10, color: '#A0A0B5', marginTop: 2 }}>
                {used.toLocaleString()} / {limit.toLocaleString()}
            </span>
        </div>
    );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Linear regression projection — returns `forecastDays` points with { date, value: null, forecast: N } */
export function projectTrend(
    series: { date: string; value: number }[],
    forecastDays = 7,
    lookback = 7,
): { date: string; value: null; forecast: number }[] {
    const recent = series.slice(-lookback);
    if (recent.length < 2) return [];
    const n = recent.length;
    const xMean = (n - 1) / 2;
    const yMean = recent.reduce((s, d) => s + d.value, 0) / n;
    const num   = recent.reduce((s, d, i) => s + (i - xMean) * (d.value - yMean), 0);
    const den   = recent.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
    const slope = den !== 0 ? num / den : 0;
    return Array.from({ length: forecastDays }, (_, i) => ({
        date: `+${i + 1}d`,
        value: null,
        forecast: Math.max(0, Math.round(yMean + slope * (i + 1))),
    }));
}

/** Appends a projected tail to a real series so TrendLine can render both */
export function withForecast(
    series: { date: string; value: number }[],
    forecastDays = 7,
): { date: string; value: number | null; forecast: number | null }[] {
    const real = series.map(d => ({ ...d, forecast: null as number | null }));
    const proj = projectTrend(series, forecastDays);
    return [...real, ...proj];
}

/** Returns week-over-week % change from the last 14 data points */
export function weekOverWeekChange(series: { value: number }[]): number {
    if (series.length < 14) return 0;
    const thisWeek = series.slice(-7).reduce((s, d) => s + d.value, 0);
    const lastWeek = series.slice(-14, -7).reduce((s, d) => s + d.value, 0);
    if (lastWeek === 0) return 0;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

/** Converts a flat number[] spark array into mock { date, value } series */
export function sparkToSeries(spark: number[]): { date: string; value: number }[] {
    return spark.map((v, i) => ({ date: `d${i + 1}`, value: v }));
}
