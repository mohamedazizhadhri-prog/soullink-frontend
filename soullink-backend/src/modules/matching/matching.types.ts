// ─── SCORE BREAKDOWN ──────────────────────────────────────────────────────────

export interface OceanScoreResult {
    score: number; // 0.0 – 1.0
    traits?: { O: number; C: number; E: number; A: number; N: number };
    detail?: string;
}

export interface InterestScoreResult {
    score: number; // 0.0 – 1.0 (Jaccard similarity)
    shared: string[];
}

export interface CompatibilityResult {
    total: number; // 0.0 – 1.0
    justification: MatchJustification;
}

export interface MatchJustification {
    score: number; // 0 – 100 (percentage)
    breakdown: {
        ocean: { score: number; label: string };
        interests: { score: number; shared: string[]; label: string };
        intent: { score: number; label: string };
    };
    highlights: string[];
}

// ─── PREFERENCE UPDATE ────────────────────────────────────────────────────────

export interface UpdatePreferenceDto {
    intent?: 'FRIEND' | 'DEEP_BOND' | 'GAMING' | 'STUDY_BUDDY' | 'ROMANCE';
    selectedInterests?: string[];
    ageRangeMin?: number;
    ageRangeMax?: number;
    preferOnline?: boolean;
}

// ─── SUGGESTION ACTION ────────────────────────────────────────────────────────

export type SuggestionAction = 'like' | 'pass';

export interface ActionResult {
    matched: boolean;
    matchId?: string;
}

// ─── CANDIDATE (what we fetch from DB) ───────────────────────────────────────

export interface CandidateUser {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    onlineStatus: string;
    city: string | null;
    country: string | null;
    personalityProfile: {
        openness: number;
        conscientiousness: number;
        extraversion: number;
        agreeableness: number;
        neuroticism: number;
        interests: any;
    } | null;
    novaMemory: {
        topInterests: string[];
    } | null;
    matchPreference: {
        intent: string;
        selectedInterests: string[];
    } | null;
}
