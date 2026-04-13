// ─── INTEREST CATEGORIES ─────────────────────────────────────────────────────
// 7 themed groups × 10 items — used by the Pinterest-style interest picker.
export const INTEREST_CATEGORIES: Record<string, string[]> = {
    Music: [
        'Jazz', 'Hip-Hop', 'Indie', 'Classical', 'Electronic',
        'Metal', 'K-Pop', 'Lo-fi', 'R&B', 'Gospel',
    ],
    Gaming: [
        'FPS', 'Valorant', 'RPG', 'Strategy', 'Sports Games',
        'Horror Games', 'Indie Games', 'Battle Royale', 'Minecraft', 'Fighting Games',
    ],
    'Creative Arts': [
        'Photography', 'Writing', 'Painting', 'Film Making', 'Digital Art',
        'Poetry', 'Architecture', 'Fashion Design', 'Illustration', 'Calligraphy',
    ],
    Lifestyle: [
        'Cooking', 'Fitness', 'Yoga', 'Travel', 'Minimalism',
        'Sustainability', 'Meditation', 'Dancing', 'Hiking', 'Gardening',
    ],
    Intellectual: [
        'Philosophy', 'Psychology', 'History', 'Science', 'Space',
        'Linguistics', 'Mathematics', 'Politics', 'Economics', 'Law',
    ],
    Entertainment: [
        'Anime', 'Manga', 'Movies', 'True Crime', 'Stand-Up Comedy',
        'Theatre', 'Books', 'Podcasts', 'Netflix Series', 'Documentaries',
    ],
    Social: [
        'Volunteering', 'Activism', 'Events & Parties', 'Cafés & Bars', 'Nightlife',
        'Museums', 'Board Games', 'Escape Rooms', 'Karaoke', 'Sports Watching',
    ],
};

// ─── INTENT COMPATIBILITY MATRIX ─────────────────────────────────────────────
// Score between 0.0–1.0: how well two intents pair together.
export const INTENT_MATRIX: Record<string, Record<string, number>> = {
    FRIEND:      { FRIEND: 1.0, DEEP_BOND: 0.8, GAMING: 0.7, STUDY_BUDDY: 0.7, ROMANCE: 0.4 },
    DEEP_BOND:   { FRIEND: 0.8, DEEP_BOND: 1.0, GAMING: 0.5, STUDY_BUDDY: 0.6, ROMANCE: 0.6 },
    GAMING:      { FRIEND: 0.7, DEEP_BOND: 0.5, GAMING: 1.0, STUDY_BUDDY: 0.5, ROMANCE: 0.4 },
    STUDY_BUDDY: { FRIEND: 0.7, DEEP_BOND: 0.6, GAMING: 0.5, STUDY_BUDDY: 1.0, ROMANCE: 0.3 },
    ROMANCE:     { FRIEND: 0.4, DEEP_BOND: 0.6, GAMING: 0.4, STUDY_BUDDY: 0.3, ROMANCE: 1.0 },
};

// ─── OCEAN WEIGHTS PER INTENT ─────────────────────────────────────────────────
// Intent-aware weights affecting how much each Big Five trait influences the score.
// Conscientiousness matters most for study pairs; Extraversion for gaming, etc.
export const OCEAN_WEIGHTS: Record<string, { O: number; C: number; E: number; A: number; N: number }> = {
    FRIEND:      { O: 0.25, C: 0.20, E: 0.15, A: 0.25, N: 0.15 },
    DEEP_BOND:   { O: 0.30, C: 0.25, E: 0.10, A: 0.25, N: 0.10 },
    GAMING:      { O: 0.15, C: 0.10, E: 0.25, A: 0.20, N: 0.30 },
    STUDY_BUDDY: { O: 0.25, C: 0.35, E: 0.10, A: 0.20, N: 0.10 },
    ROMANCE:     { O: 0.25, C: 0.20, E: 0.20, A: 0.25, N: 0.10 },
};

// ─── MISC CONFIG ──────────────────────────────────────────────────────────────
export const SUGGESTIONS_PER_DAY   = 5;
export const SUGGESTION_EXPIRY_H   = 24; // hours
export const CANDIDATE_POOL_SIZE   = 100;
export const MIN_INTERESTS_REQUIRED = 5;
