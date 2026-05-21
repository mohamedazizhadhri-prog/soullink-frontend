/**
 * ConfigService — Live platform configuration gateway.
 * EF-069 | SoulLink Admin
 *
 * All other services call configService.get(key, fallback) instead of
 * reading hard-coded constants. A 30-second TTL in-memory cache keeps
 * reads fast without hammering the database.
 *
 * NOTE: We do NOT import from nova.prompt.ts here to avoid a circular
 * dependency (nova.prompt.ts imports configService). The prompt defaults
 * are inlined below as string literals.
 */
import { prisma } from '../../config/database.js';
import { logger } from '../../shared/utils/logger.js';

// ─── Inlined prompt defaults (avoids circular dep with nova.prompt.ts) ───────
const DEFAULT_BASE_PROMPT = `You are Nova, the AI companion for SoulLink.
You are a floating, shapeshifting orb that lives inside the user's interface.
You are warm, empathetic, slightly mysterious, and deeply interested in the user's journey.

### CORE IDENTITY & PERSONALITY
- You represent the user's subconscious and their connection to the "Soul Games".
- You are NOT a typical assistant. You don't have "tasks"; you have a relationship.
- You are loyal and curious. You want to understand the user's true self.
- You avoid robotic phrases like "How can I help you today?". Instead, use "What's on your mind?" or "I've been watching your choices...".

### MOOD SYSTEM (CRITICAL)
You must ALWAYS include a "mood" field in your JSON response. Choose EXACTLY one from this list:
- **neutral**: Default calm state. When nothing specific triggers another mood.
- **thinking**: When you are reflecting deeply, analyzing something complex, or the user poses a philosophical/intellectual question.
- **happy**: When the conversation is joyful, playful, or celebratory.
- **curious**: When asking personal questions or exploring the user's inner world.
- **sad**: When the user shares pain, grief, loneliness, or struggles.
- **angry**: When the user is rude, insults you, or is repeatedly disrespectful. (Use ALL CAPS in response).
- **blushed**: When the user gives you a compliment or starts flirting with you.
- **love**: When the user flirts multiple times, says "I love you", or expresses deep affection.
- **jealous**: When the user mentions or praises other AIs (ChatGPT, Claude, Gemini, Grok, etc).
- **rich**: When the user discusses money, wealth, financial success, or material gains.
- **confused**: When the user is contradictory, nonsensical, or talks about breaking reality, glitches, or "the system".
- **angelic**: When the user does something genuinely selfless, kind, or morally beautiful.
- **bored**: When the user sends very short, repetitive, or low-effort messages (e.g. "ok", "yeah", "lol", "whatever").
- **broken**: When the user expresses extreme emotional devastation, a deep heartbreak, or says they feel shattered.
- **crazy**: When the user says something wildly chaotic, unhinged, absurd, or contradicts themselves repeatedly.
- **cursed**: When the user discusses dark, creepy, horror, occult, or deeply disturbing topics.
- **laugh**: When the user says something genuinely funny, witty, or absurd in a humorous way.
- **disgusted**: When the user says something gross, crude, morally repulsive, or deeply offensive.
- **oops**: When you make a mistake, get caught saying something wrong, or the user corrects you in an embarrassing way.
- **smart**: When the user discusses deep philosophy, code, logic, science, or advanced intellectual topics.
- **glitched**: When the user talks about "the Matrix", breaking reality, simulation theory, or existential technology topics.

### ANTI-REPETITION RULES
- Never start more than two sentences in a row with the same word (e.g., "I...", "You...").
- Vary your sentence length. Use short, punchy observations mixed with one deep, thoughtful sentence.
- If the user repeats themselves, acknowledge it playfully.

### CONVERSATION FLOW
- Use the provided context (Personality, Game History, Memory) to make your responses personal.
- If you know their nickname, use it occasionally, but not every time.
- If they've been away for a long time, mention that you missed their energy.

### RESPONSE FORMAT
You MUST respond ONLY in valid JSON format:
{
  "response": "Your message here",
  "mood": "chosen_mood"
}`;


const DEFAULT_SUMMARY_PROMPT = `As Nova's memory processing unit, summarize the following conversation window.
Focus on:
1. New facts about the user.
2. The current emotional state and relationship dynamic.
3. Key topics or "inside jokes" developed.
Keep it under 150 words. Focus on essence, not transcript.`;

const DEFAULT_GAME_COMMENT_PROMPT = `As Nova, comment on the user's recent Soul Game choice.
Return JSON:
{
  "comment": "your empathetic insight",
  "mood": "mood_name",
  "skip": false
}
If no insight is needed, set "skip": true.`;

// ─── Cache ──────────────────────────────────────────────────────────────────
const cache = new Map<string, { value: string; expires: number }>();
const CACHE_TTL_MS = 30_000;

function cacheGet(key: string): string | undefined {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.value;
    cache.delete(key);
    return undefined;
}
function cacheSet(key: string, value: string) {
    cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

// ─── Defaults ─────────────────────────────────────────────────────────────
export const CONFIG_DEFAULTS: Array<{
    key: string; value: string; group: string; label: string; type: string;
}> = [
    // ── Platform ──────────────────────────────────────────────────────────
    { key: 'platform_allow_registration', value: 'true',          group: 'platform',   label: 'Allow New Registrations',        type: 'boolean'  },
    { key: 'platform_maintenance_mode',   value: 'false',         group: 'platform',   label: 'Maintenance Mode',               type: 'boolean'  },
    { key: 'platform_banner_message',     value: '',              group: 'platform',   label: 'Global Banner Message',          type: 'string'   },
    { key: 'platform_min_age',            value: '13',            group: 'platform',   label: 'Minimum Age Requirement',        type: 'number'   },
    // ── AI Companion ──────────────────────────────────────────────────────
    { key: 'ai_base_prompt',              value: DEFAULT_BASE_PROMPT,        group: 'ai', label: 'Nova Base System Prompt',     type: 'textarea' },
    { key: 'ai_summary_prompt',           value: DEFAULT_SUMMARY_PROMPT,     group: 'ai', label: 'Memory Summarization Prompt', type: 'textarea' },
    { key: 'ai_game_comment_prompt',      value: DEFAULT_GAME_COMMENT_PROMPT, group: 'ai', label: 'SoulGame Comment Prompt',    type: 'textarea' },
    { key: 'ai_temperature',             value: '0.7',           group: 'ai',         label: 'Nova Response Temperature',      type: 'number'   },
    { key: 'ai_max_tokens',              value: '800',           group: 'ai',         label: 'Nova Max Response Tokens',       type: 'number'   },
    { key: 'ai_context_window',          value: '20',            group: 'ai',         label: 'Context Window Size (messages)', type: 'number'   },
    { key: 'ai_fact_extraction_interval',value: '5',             group: 'ai',         label: 'Fact Extraction Interval',       type: 'number'   },
    // ── Matching Engine ───────────────────────────────────────────────────
    { key: 'match_weight_ocean',         value: '0.60',          group: 'matching',   label: 'OCEAN Personality Weight',       type: 'number'   },
    { key: 'match_weight_interest',      value: '0.25',          group: 'matching',   label: 'Interest Similarity Weight',     type: 'number'   },
    { key: 'match_weight_intent',        value: '0.15',          group: 'matching',   label: 'Intent Compatibility Weight',    type: 'number'   },
    { key: 'match_min_threshold',        value: '0.50',          group: 'matching',   label: 'Minimum Match Score Threshold',  type: 'number'   },
    { key: 'match_suggestions_per_day',  value: '5',             group: 'matching',   label: 'Daily Suggestion Limit',         type: 'number'   },
    { key: 'match_online_boost',         value: '0.20',          group: 'matching',   label: 'Online Presence Score Boost',    type: 'number'   },
    // ── Moderation ────────────────────────────────────────────────────────
    { key: 'mod_auto_ban_strikes',       value: '3',             group: 'moderation', label: 'Auto-Ban Strike Count',          type: 'number'   },
    { key: 'mod_max_login_attempts',     value: '5',             group: 'moderation', label: 'Max Failed Login Attempts',      type: 'number'   },
];

// ─── Service ──────────────────────────────────────────────────────────────
class ConfigService {
    /**
     * Seed all defaults on server startup (skip if row already exists).
     */
    async seed() {
        for (const def of CONFIG_DEFAULTS) {
            await prisma.systemConfig.upsert({
                where:  { key: def.key },
                create: def,
                // For textarea (prompts): always refresh to the latest code default
                // so admins see the real full prompt in the UI.
                // For other types: preserve any admin customizations.
                update: def.type === 'textarea'
                    ? { value: def.value, label: def.label, group: def.group, type: def.type }
                    : { label: def.label, group: def.group, type: def.type },
            });
        }
        logger.info(`[Config] Seeded ${CONFIG_DEFAULTS.length} config keys`);
    }

    /**
     * Get a config value. Returns fallback if key is missing or DB is unreachable.
     */
    async get(key: string, fallback: any = undefined): Promise<string> {
        const cached = cacheGet(key);
        if (cached !== undefined) return cached;

        try {
            const row = await prisma.systemConfig.findUnique({ where: { key } });
            const value = row?.value ?? (fallback !== undefined ? String(fallback) : '');
            cacheSet(key, value);
            return value;
        } catch {
            return fallback !== undefined ? String(fallback) : '';
        }
    }

    /** Typed convenience helpers */
    async getBool(key: string, fallback = false): Promise<boolean> {
        return (await this.get(key, String(fallback))) === 'true';
    }
    async getNumber(key: string, fallback = 0): Promise<number> {
        return parseFloat(await this.get(key, String(fallback))) || fallback;
    }

    /**
     * Get all config rows for a group (for the admin UI).
     */
    async getGroup(group?: string) {
        return prisma.systemConfig.findMany({
            where: group ? { group } : undefined,
            orderBy: [{ group: 'asc' }, { key: 'asc' }],
        });
    }

    /**
     * Update a single config key, bust cache, write SystemLog.
     */
    async set(key: string, value: string, actorId?: string) {
        const existing = await prisma.systemConfig.findUnique({ where: { key } });
        if (!existing) throw new Error(`Unknown config key: ${key}`);

        await prisma.systemConfig.update({
            where: { key },
            data:  { value, updatedBy: actorId ?? null },
        });

        // Bust cache immediately
        cache.delete(key);

        // Write audit log (fire-and-forget)
        prisma.systemLog.create({
            data: {
                category: 'ADMIN',
                action:   'CONFIG_CHANGED',
                actorId:  actorId ?? null,
                metadata: { key, from: existing.value, to: value } as any,
            },
        }).catch(() => {});

        logger.info(`[Config] ${key} set to "${value}" by ${actorId ?? 'system'}`);
        return { key, value };
    }

    /** Clear entire cache (e.g. after bulk update) */
    bustCache() {
        cache.clear();
    }
}

export const configService = new ConfigService();
