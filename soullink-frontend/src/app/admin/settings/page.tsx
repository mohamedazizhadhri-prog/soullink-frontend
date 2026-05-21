'use client';

/**
 * Admin Settings Page — /admin/settings
 * EF-069: System Configuration & Toggles
 * EF-074: AI Version Management (via AI Models page, cached here)
 *
 * 6 Accordion sections:
 *   🌐 Platform Controls — maintenance, registration, banner, min age
 *   🤖 Nova AI Prompts — base, summary, game comment prompts (textarea)
 *   🧠 Nova AI Parameters — temperature, max tokens, context window, extraction interval
 *   🧩 Matching Engine — OCEAN/interest/intent weights (auto-balance), threshold, suggestions/day, online boost
 *   🛡️ Moderation Rules — auto-ban strikes, max login attempts
 *   🎮 Soul Games — existing toggle list
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import { ConfirmationModal } from '@/components/admin/AdminModal';
import s from './settings.module.css';
import {
    Check,
    Save,
    Loader2,
    AlertTriangle,
    ChevronRight,
    Settings,
    Globe,
    Bot,
    Brain,
    Puzzle,
    Shield,
    Gamepad2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConfigRow { key: string; value: string; group: string; label: string; type: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getConfigMap(rows: ConfigRow[]): Record<string, string> {
    const map: Record<string, string> = {};
    if (!Array.isArray(rows)) return map;
    rows.forEach(r => {
        if (r && typeof r === 'object' && r.key) {
            map[r.key] = r.value;
        }
    });
    return map;
}

// ─── Save button with feedback ───────────────────────────────────────────────
function SaveBtn({ onSave, disabled }: { onSave: () => Promise<void>; disabled?: boolean }) {
    const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const handle = async () => {
        setState('saving');
        try { await onSave(); setState('saved'); setTimeout(() => setState('idle'), 1800); }
        catch { setState('idle'); }
    };
    return (
        <button
            className={`${s.saveBtn} ${state === 'saved' ? s.saved : ''}`}
            onClick={handle}
            disabled={disabled || state === 'saving'}
            aria-label="Save this setting"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
        >
            {state === 'saving' ? (
                <>
                    <Loader2 size={13} className={s.spin} />
                    <span>Saving...</span>
                </>
            ) : state === 'saved' ? (
                <>
                    <Check size={13} />
                    <span>Saved</span>
                </>
            ) : (
                <>
                    <Save size={13} />
                    <span>Save</span>
                </>
            )}
        </button>
    );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ cfgKey, label, hint, value, danger, onSave }: {
    cfgKey: string; label: string; hint?: string;
    value: string; danger?: boolean; onSave: (key: string, val: string) => Promise<void>;
}) {
    const [local, setLocal] = useState(value === 'true');
    useEffect(() => setLocal(value === 'true'), [value]);
    return (
        <div className={s.configRow}>
            <div>
                <div className={s.configLabel}>
                    {label}
                    {danger && (
                        <span className={s.warnBadge} style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={10} /> Critical
                        </span>
                    )}
                </div>
                {hint && <div className={s.configHint}>{hint}</div>}
            </div>
            <div className={s.configControl}>
                <label className={`${s.toggle} ${danger ? s.danger : ''}`}>
                    <input type="checkbox" checked={local} onChange={e => setLocal(e.target.checked)} />
                    <span className={s.toggleSlider} />
                </label>
                <SaveBtn onSave={() => onSave(cfgKey, String(local))} />
            </div>
        </div>
    );
}

// ─── Text/Number Row ─────────────────────────────────────────────────────────
function InputRow({ cfgKey, label, hint, value, type = 'text', onSave }: {
    cfgKey: string; label: string; hint?: string;
    value: string; type?: string; onSave: (key: string, val: string) => Promise<void>;
}) {
    const [local, setLocal] = useState(value);
    useEffect(() => setLocal(value), [value]);
    return (
        <div className={s.configRow}>
            <div>
                <div className={s.configLabel}>{label}</div>
                {hint && <div className={s.configHint}>{hint}</div>}
            </div>
            <div className={s.configControl}>
                <input
                    type={type} className={`${s.input} ${type === 'number' ? s.narrow : ''}`}
                    value={local} onChange={e => setLocal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onSave(cfgKey, local)}
                />
                <SaveBtn onSave={() => onSave(cfgKey, local)} />
            </div>
        </div>
    );
}

// ─── Textarea Row ────────────────────────────────────────────────────────────
function TextareaRow({ cfgKey, label, hint, value, onSave }: {
    cfgKey: string; label: string; hint?: string;
    value: string; onSave: (key: string, val: string) => Promise<void>;
}) {
    const [local, setLocal] = useState(value);
    useEffect(() => setLocal(value), [value]);
    return (
        <div style={{ paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                    <div className={s.configLabel}>{label}</div>
                    {hint && <div className={s.configHint}>{hint}</div>}
                </div>
                <SaveBtn onSave={() => onSave(cfgKey, local)} />
            </div>
            <textarea
                className={s.textarea} value={local}
                onChange={e => setLocal(e.target.value)}
                rows={8}
                aria-label={label}
            />
        </div>
    );
}

// ─── Slider Row ───────────────────────────────────────────────────────────────
function SliderRow({ cfgKey, label, hint, value, min = 0, max = 1, step = 0.01, onSave, suffix = '' }: {
    cfgKey: string; label: string; hint?: string; suffix?: string;
    value: string; min?: number; max?: number; step?: number;
    onSave: (key: string, val: string) => Promise<void>;
}) {
    const numVal = parseFloat(value) || 0;
    const [local, setLocal] = useState(numVal);
    useEffect(() => setLocal(parseFloat(value) || 0), [value]);
    const pct = `${Math.round(((local - min) / (max - min)) * 100)}%`;
    return (
        <div className={s.configRow}>
            <div>
                <div className={s.configLabel}>{label}</div>
                {hint && <div className={s.configHint}>{hint}</div>}
            </div>
            <div className={s.configControl}>
                <div className={s.sliderRow}>
                    <input
                        type="range" className={s.slider} min={min} max={max} step={step}
                        value={local} style={{ '--pct': pct } as any}
                        onChange={e => setLocal(parseFloat(e.target.value))}
                        aria-label={label}
                    />
                    <span className={s.sliderValue}>{suffix ? `${local}${suffix}` : (step < 1 ? local.toFixed(2) : local)}</span>
                </div>
                <SaveBtn onSave={() => onSave(cfgKey, String(local))} />
            </div>
        </div>
    );
}

// ─── Matching Weight Triple Slider ────────────────────────────────────────────
function WeightRow({ ocean, interest, intent, onSave }: {
    ocean: string; interest: string; intent: string;
    onSave: (key: string, val: string) => Promise<void>;
}) {
    const [w, setW] = useState({
        ocean: parseFloat(ocean) || 0.60,
        interest: parseFloat(interest) || 0.25,
        intent: parseFloat(intent) || 0.15,
    });
    useEffect(() => {
        setW({
            ocean: parseFloat(String(ocean)) || 0.60,
            interest: parseFloat(String(interest)) || 0.25,
            intent: parseFloat(String(intent)) || 0.15,
        });
    }, [ocean, interest, intent]);

    const sum = Math.round((w.ocean + w.interest + w.intent) * 100);
    const sumOk = sum === 100;

    const handleChange = (field: 'ocean' | 'interest' | 'intent', raw: number) => {
        const val = Math.round(raw * 100) / 100;
        setW(prev => ({ ...prev, [field]: val }));
    };

    const saveAll = async () => {
        await Promise.all([
            onSave('match_weight_ocean',    w.ocean.toFixed(2)),
            onSave('match_weight_interest', w.interest.toFixed(2)),
            onSave('match_weight_intent',   w.intent.toFixed(2)),
        ]);
    };

    const sliders: { key: 'ocean' | 'interest' | 'intent'; label: string }[] = [
        { key: 'ocean',    label: 'OCEAN Personality' },
        { key: 'interest', label: 'Interest Similarity' },
        { key: 'intent',   label: 'Intent Compatibility' },
    ];

    return (
        <div style={{ paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                    <div className={s.configLabel}>Matching Score Weights</div>
                    <div className={s.configHint}>These three must add up to 100%. Drag to adjust.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`${s.sliderSum} ${sumOk ? s.sliderSumOk : s.sliderSumBad}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Sum: {sum}%{!sumOk && <AlertTriangle size={12} />}
                    </span>
                    <SaveBtn onSave={saveAll} disabled={!sumOk} />
                </div>
            </div>
            {sliders.map(sl => (
                <div key={sl.key} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#A0A0B5', minWidth: 120 }}>{sl.label}</span>
                    <div className={s.sliderRow}>
                        <input
                            type="range" className={s.slider} min={0} max={1} step={0.01}
                            value={w[sl.key]}
                            style={{ '--pct': `${Math.round(w[sl.key] * 100)}%` } as any}
                            onChange={e => handleChange(sl.key, parseFloat(e.target.value))}
                            aria-label={`${sl.label} weight`}
                        />
                        <span className={s.sliderValue}>{Math.round(w[sl.key] * 100)}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Accordion Section Wrapper ────────────────────────────────────────────────
function Section({ icon, title, desc, defaultOpen = false, children }: {
    icon: React.ReactNode; title: string; desc: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={s.section}>
            <button
                className={s.sectionHeader}
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
            >
                <div className={s.sectionHeaderLeft}>
                    <span className={s.sectionIcon} style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
                    <div>
                        <div className={s.sectionTitle}>{title}</div>
                        <div className={s.sectionDesc}>{desc}</div>
                    </div>
                </div>
                <span className={`${s.chevron} ${open ? s.open : ''}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <ChevronRight size={16} />
                </span>
            </button>
            {open && <div className={s.sectionBody}>{children}</div>}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
    const [config, setConfig] = useState<ConfigRow[]>([]);
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingGameId, setSavingGameId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {} });

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            // apiFetch already unwraps .data from { status, data: ... }
            // Run all three in parallel but handle each failure independently
            const [cfgResult, gResult] = await Promise.allSettled([
                adminApi.getConfig(),
                adminApi.listSoulGames(),
            ]);

            if (cfgResult.status === 'fulfilled') {
                const raw = cfgResult.value;
                // Safely extract config array
                let finalCfg: ConfigRow[] = [];
                if (Array.isArray(raw)) finalCfg = raw;
                else if (raw && typeof raw === 'object' && Array.isArray(raw.data)) finalCfg = raw.data;
                else if (raw && typeof raw === 'object' && Array.isArray(raw.config)) finalCfg = raw.config;
                
                setConfig(finalCfg);
            } else {
                setError(cfgResult.reason?.message ?? 'Failed to load config');
            }

            if (gResult.status === 'fulfilled') {
                const raw = gResult.value;
                let finalGames = [];
                if (Array.isArray(raw)) finalGames = raw;
                else if (raw && typeof raw === 'object') finalGames = raw.games ?? raw.data ?? [];
                setGames(finalGames);
            }

        } catch (e: any) {
            setError(e.message ?? 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Quick lookup map
    const cfg = getConfigMap(config);

    const save = useCallback(async (key: string, value: string) => {
        await adminApi.updateConfig(key, value);
        // Update local state immediately so UI reflects the new value without re-fetch
        setConfig(prev => prev.map(r => r.key === key ? { ...r, value } : r));
    }, []);

    const handleToggleGame = async (id: string, isActive: boolean) => {
        setSavingGameId(id);
        try { await adminApi.toggleSoulGame(id, !isActive); load(); }
        catch (e: any) { alert('Error: ' + e.message); }
        finally { setSavingGameId(null); }
    };

    return (
        <div className={s.shell}>
            <AdminSidebar />
            <main className={s.main}>

                <div className={s.header}>
                    <div>
                        <h1 className={s.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={24} style={{ color: '#7B68EE' }} /> Platform Settings
                        </h1>
                        <div className={s.subtitle}>All changes take effect within 30 seconds — no server restart needed.</div>
                    </div>
                </div>

                {error && (
                    <div className={s.errorBanner} role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {loading ? (
                    <div className={s.loadingText}>Loading configuration…</div>
                ) : (
                    <>
                        {/* ── Platform Controls ─────────────────────────────── */}
                        <Section icon={<Globe size={18} />} title="Platform Controls" desc="Global access switches, maintenance mode, and registration gates." defaultOpen>
                            <ToggleRow
                                cfgKey="platform_maintenance_mode"
                                label="Maintenance Mode"
                                hint="When ON, all non-admin users are blocked with a 503 response. Use before deployments."
                                value={cfg['platform_maintenance_mode'] ?? 'false'}
                                danger
                                onSave={save}
                            />
                            <ToggleRow
                                cfgKey="platform_allow_registration"
                                label="Allow New Registrations"
                                hint="When OFF, new users cannot create accounts. Existing users are unaffected."
                                value={cfg['platform_allow_registration'] ?? 'true'}
                                danger
                                onSave={save}
                            />
                            <InputRow
                                cfgKey="platform_banner_message"
                                label="Global Banner Message"
                                hint="If non-empty, this text is shown at the top of every page for all users."
                                value={cfg['platform_banner_message'] ?? ''}
                                onSave={save}
                            />
                            <InputRow
                                cfgKey="platform_min_age"
                                label="Minimum Age Requirement"
                                hint="Users below this age will be rejected at registration."
                                value={cfg['platform_min_age'] ?? '13'}
                                type="number"
                                onSave={save}
                            />
                        </Section>

                        {/* ── Nova AI Prompts ───────────────────────────────── */}
                        <Section icon={<Bot size={18} />} title="Nova AI Prompts" desc="Edit the live system prompts that define Nova's personality and behaviour.">
                            <TextareaRow
                                cfgKey="ai_base_prompt"
                                label="Base System Prompt"
                                hint="Nova's core identity, mood system rules, and response format instructions."
                                value={cfg['ai_base_prompt'] ?? ''}
                                onSave={save}
                            />
                            <TextareaRow
                                cfgKey="ai_summary_prompt"
                                label="Memory Summarization Prompt"
                                hint="Used when Nova compresses long conversation histories into memory."
                                value={cfg['ai_summary_prompt'] ?? ''}
                                onSave={save}
                            />
                            <TextareaRow
                                cfgKey="ai_game_comment_prompt"
                                label="SoulGame Comment Prompt"
                                hint="Used when Nova reacts to a user's choice in a personality game."
                                value={cfg['ai_game_comment_prompt'] ?? ''}
                                onSave={save}
                            />
                        </Section>

                        {/* ── Nova AI Parameters ────────────────────────────── */}
                        <Section icon={<Brain size={18} />} title="Nova AI Parameters" desc="Tune Nova's LLM call settings without restarting the server.">
                            <SliderRow
                                cfgKey="ai_temperature"
                                label="Response Temperature"
                                hint="Higher = more creative/random. Lower = more deterministic. (0.0 – 1.0)"
                                value={cfg['ai_temperature'] ?? '0.7'}
                                min={0} max={1} step={0.05}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="ai_max_tokens"
                                label="Max Response Tokens"
                                hint="Maximum number of tokens Nova will generate per response. (200 – 2000)"
                                value={cfg['ai_max_tokens'] ?? '800'}
                                min={200} max={2000} step={50}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="ai_context_window"
                                label="Context Window Size"
                                hint="Number of past messages sent to the LLM. More = better memory, higher cost. (5 – 50)"
                                value={cfg['ai_context_window'] ?? '20'}
                                min={5} max={50} step={1}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="ai_fact_extraction_interval"
                                label="Fact Extraction Interval"
                                hint="Every N messages, Nova extracts facts about the user into long-term memory."
                                value={cfg['ai_fact_extraction_interval'] ?? '5'}
                                min={1} max={30} step={1}
                                onSave={save}
                            />
                        </Section>

                        {/* ── Matching Engine ───────────────────────────────── */}
                        <Section icon={<Puzzle size={18} />} title="Matching Engine" desc="Control the compatibility scoring formula and suggestion behavior.">
                            <WeightRow
                                ocean={cfg['match_weight_ocean'] ?? '0.60'}
                                interest={cfg['match_weight_interest'] ?? '0.25'}
                                intent={cfg['match_weight_intent'] ?? '0.15'}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="match_min_threshold"
                                label="Minimum Match Score Threshold"
                                hint="Matches scoring below this percentage are rejected (standard mode only)."
                                value={cfg['match_min_threshold'] ?? '0.50'}
                                min={0} max={1} step={0.05}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="match_suggestions_per_day"
                                label="Daily Suggestion Limit"
                                hint="How many match suggestions each user gets per day."
                                value={cfg['match_suggestions_per_day'] ?? '5'}
                                min={1} max={20} step={1}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="match_online_boost"
                                label="Online Presence Boost"
                                hint="Score bonus added to currently-online users in Quick Match mode."
                                value={cfg['match_online_boost'] ?? '0.20'}
                                min={0} max={0.5} step={0.05}
                                onSave={save}
                            />
                        </Section>

                        {/* ── Moderation Rules ──────────────────────────────── */}
                        <Section icon={<Shield size={18} />} title="Moderation Rules" desc="Automated safety thresholds and rate-limiting rules.">
                            <SliderRow
                                cfgKey="mod_auto_ban_strikes"
                                label="Auto-Ban Strike Count"
                                hint="A user is automatically banned after receiving this many moderation strikes."
                                value={cfg['mod_auto_ban_strikes'] ?? '3'}
                                min={1} max={10} step={1}
                                onSave={save}
                            />
                            <SliderRow
                                cfgKey="mod_max_login_attempts"
                                label="Max Failed Login Attempts"
                                hint="Account is temporarily locked after this many consecutive failed password attempts."
                                value={cfg['mod_max_login_attempts'] ?? '5'}
                                min={3} max={20} step={1}
                                onSave={save}
                            />
                        </Section>

                        {/* ── Soul Games ────────────────────────────────────── */}
                        <Section icon={<Gamepad2 size={18} />} title="Soul Games" desc="Enable or disable personality assessment game episodes.">
                            <div className={s.gameList} role="list">
                                {games.length === 0
                                    ? <div className={s.empty}>No games found.</div>
                                    : games.map((g: any) => (
                                        <div key={g.id} className={s.gameRow} role="listitem">
                                            <span className={s.gameIcon}>{g.icon}</span>
                                            <div className={s.gameMeta}>
                                                <span className={s.gameTitle}>{g.title}</span>
                                                <span className={s.gameEpisode}>Episode {g.episode}</span>
                                            </div>
                                            <div className={s.gameActions}>
                                                <button
                                                    id={`toggle-game-${g.id}`}
                                                    className={g.isActive ? s.activeToggle : s.inactiveToggle}
                                                    onClick={() => handleToggleGame(g.id, g.isActive)}
                                                    disabled={savingGameId === g.id}
                                                    aria-label={`${g.isActive ? 'Disable' : 'Enable'} ${g.title}`}
                                                    aria-pressed={g.isActive}
                                                >
                                                    {savingGameId === g.id ? '…' : g.isActive ? '● Active' : '○ Inactive'}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </Section>
                    </>
                )}
            </main>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={true}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
