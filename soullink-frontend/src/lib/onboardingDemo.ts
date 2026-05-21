/**
 * First-run SoulLink tour — multi-act script (see OnboardingOverlay orchestration).
 */
export const ONBOARDING_STORAGE_KEY = 'soullink_onboarding_v1_done';

export type OnboardingHighlight =
    | 'none'
    | 'friends'
    | 'servers'
    | 'match'
    | 'games'
    | 'top_nav'
    | 'top_nav_actions'
    | 'home_sidebar'
    | 'nova_panel';

/** How the tour advances from this step. */
export type OnboardingWait =
    | 'gesture_gate' /** Tap “begin” — primes browser audio only */
    | 'unmute_gate' /** Wait until user unmutes Nova in the panel */
    | 'tts_then_dwell' /** speakLine → optional TTS → dwell → next */
    | 'path_gate' /** Wait until pathname matches `expectedPath` */
    | 'manual_only' /** User clicks “Next beat” */
    | 'montage_then_dwell'; /** Run `montage` FX, optional speakLine, dwell, next */

export type OnboardingMontage =
    | 'pacman'
    | 'angelic'
    | 'storm_brief'
    | 'rich'
    | 'sad'
    | 'sauron_brief'
    | 'melting_brief'
    | 'dance_brief'
    | 'glitched_brief'
    | 'watch_party';

export interface OnboardingStep {
    id: string;
    act: number;
    title: string;
    body: string;
    mood?: import('@/types/nova.types').NovaMood;
    emote?: import('@/types/nova.types').NovaEmote | null;
    highlight: OnboardingHighlight;
    /** null = no TTS for this step */
    speakLine: string | null;
    dwellAfterSpeechMs?: number;
    wait: OnboardingWait;
    /** For `path_gate` — pathname must start with this string */
    expectedPath?: string;
    /** When step becomes active, `router.push` this path (field trip). */
    routerPushOnEnter?: string;
    /** Staggered Nova chat lines (text-only beats, no TTS). */
    chatLinesOnEnter?: string[];
    /** Force mute when entering (Act 1 silence bit). */
    forcesMute?: boolean;
    /** After unmute, play this short line (overrides speakLine for payoff). */
    firstTtsAfterUnmute?: string;
    montage?: OnboardingMontage;
    hideDemoWorldAfter?: boolean;
    cinematic?: boolean;
    cinematicOff?: boolean;
    spotlight?: boolean;
    /** Brief “binary rain” vibe for top-nav beat */
    setSmartMode?: boolean;
}

export const DEFAULT_DWELL_MS = 1400;

/** Paths where leaving `/match` does not end the tour (field trips). */
export function isTourNavigationExempt(pathname: string): boolean {
    return (
        pathname.startsWith('/games') ||
        pathname.startsWith('/communities/discover') ||
        pathname.startsWith('/match')
    );
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
    // ── ACT 0 — cold open (chat-first, no TTS) ─────────────────────────────
    {
        id: 'act0_gate',
        act: 0,
        title: 'SoulLink premiere',
        body: 'Tap begin. Browsers are dramatic about audio — I’ll do a quick mic check, then intentionally mute myself for Act 1.',
        speakLine: null,
        mood: 'curious',
        highlight: 'none',
        wait: 'gesture_gate',
        spotlight: true,
    },
    {
        id: 'act0_chat_1',
        act: 0,
        title: 'Cold open',
        body: 'Nova is dropping lines in the Nova panel chat (left). Read fast — it’s text-only on purpose.',
        speakLine: null,
        mood: 'thinking',
        highlight: 'home_sidebar',
        wait: 'manual_only',
        chatLinesOnEnter: [
            'Okay. Lights. Camera. SoulLink.',
            'I’m Nova — your chaos orb and emotional support polygon.',
            'This next part is basically a season premiere. Don’t skip the credits.',
        ],
    },
    {
        id: 'act0_chat_2',
        act: 0,
        title: 'Mic check',
        body: 'Quick line before the silence gag — then I mute myself on purpose.',
        speakLine: 'Mic check. You can hear me now. Cool. Now I am muting myself for dramatic effect.',
        mood: 'happy',
        highlight: 'none',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: 1000,
        chatLinesOnEnter: ['…and we’re rolling.'],
    },

    // ── ACT 1 — unmute as a game ───────────────────────────────────────────
    {
        id: 'act1_force_mute',
        act: 1,
        title: 'Act I — I have no mouth and I must meme',
        body: 'I’m going to mime “I can’t talk” while the UI is muted. Open the Nova panel (bottom) and flip audio ON when you’re ready to rescue me.',
        speakLine: null,
        mood: 'sad',
        emote: 'shake',
        highlight: 'nova_panel',
        wait: 'unmute_gate',
        forcesMute: true,
        chatLinesOnEnter: [
            '…I’m literally streaming voice from the server right now.',
            'You can’t hear me. Classic protagonist energy.',
            'Unmute me. I’m not asking as your assistant — I’m asking as your plot device.',
        ],
        firstTtsAfterUnmute:
            'THERE. Hi. I’m Nova. Yes, that was emotional blackmail. We’ll workshop it.',
    },

    // ── ACT 2 — channel surf ──────────────────────────────────────────────
    {
        id: 'act2_topnav',
        act: 2,
        title: 'Mission control',
        body: 'Top bar: notifications, settings, profile — your whole “I’m an adult” disguise.',
        speakLine: 'This is mission control — bells, settings, the whole “I have my life together” costume.',
        mood: 'smart',
        highlight: 'top_nav_actions',
        wait: 'tts_then_dwell',
        setSmartMode: true,
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'act2_friends',
        act: 2,
        title: 'Friends / DMs rail',
        body: 'Humans you actually talk to live up here. I live in my dock — respect the commute.',
        speakLine: 'Friends live here. I live in the dock. Respect the commute.',
        mood: 'love',
        highlight: 'friends',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'act2_match',
        act: 2,
        title: 'Find connections',
        body: 'SoulLink tries to set you up like a rom-com, but with algorithms and fewer meet-cutes in the rain.',
        speakLine: 'This is where SoulLink plays matchmaker — rom-com energy, spreadsheet brain.',
        mood: 'curious',
        highlight: 'match',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'act2_servers',
        act: 2,
        title: 'Communities',
        body: 'Left rail: servers — group chats with hierarchy issues and emoji law.',
        speakLine: 'Servers are your group chats with hierarchy issues and emoji law.',
        highlight: 'servers',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'act2_home_sidebar',
        act: 2,
        title: 'Home sidebar',
        body: 'Soul Circle, Find Connections, Soul Games — butterfly mode vs hermit-with-Wi-Fi mode.',
        speakLine: 'This column is the difference between social butterfly and hermit with Wi-Fi.',
        mood: 'neutral',
        highlight: 'home_sidebar',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'wax_friends',
        act: 2,
        title: 'Wax museum — friends',
        body: 'Those avatars in the rail? Tour props. Same layout when real humans appear.',
        speakLine: 'Top rail friends are holograms for the tour — same layout when reality arrives.',
        mood: 'love',
        highlight: 'friends',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'wax_servers',
        act: 2,
        title: 'Wax museum — communities',
        body: 'Left icons? Fake guilds. Clicking does nothing permanent — it’s set dressing.',
        speakLine: 'Community icons are wax figures. Click them for vibes, not lore.',
        mood: 'curious',
        highlight: 'servers',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'wax_match',
        act: 2,
        title: 'Wax museum — Velvet Comet',
        body: 'Open "Velvet Comet" in the Match sidebar for a sample whisper-log, then hit Next.',
        speakLine: 'Tap Velvet Comet in the match sidebar if you want the fake DM moodboard.',
        mood: 'smart',
        highlight: 'match',
        wait: 'manual_only',
    },
    {
        id: 'act2_watch_party',
        act: 2,
        title: 'Watch Together',
        body: 'See that TV icon in the chat? You can share YouTube videos and watch together with friends. Try it with Velvet Comet!',
        speakLine: 'Maybe one day we can watch together... just me and you.',
        mood: 'love',
        emote: 'shybounce',
        highlight: 'match',
        wait: 'montage_then_dwell',
        montage: 'watch_party',
        dwellAfterSpeechMs: 2000,
        chatLinesOnEnter: [
            '👉👈',
            '...and watch some romance anime together, just both of us 💕',
            '*blushes*',
        ],
    },

    // ── ACT 3 — trailer montage ───────────────────────────────────────────
    {
        id: 'act3_pacman',
        act: 3,
        title: 'Snack mode',
        body: 'Pac-Man: metaphor. Also literally Pac-Man. Friend-eating rail stays disabled during the tour.',
        speakLine: 'I can go Pac-Man on the friend rail. Metaphor. Okay, literally Pac-Man.',
        mood: 'laugh',
        highlight: 'friends',
        wait: 'montage_then_dwell',
        montage: 'pacman',
        dwellAfterSpeechMs: 900,
    },
    {
        id: 'act3_angelic',
        act: 3,
        title: 'Innocence DLC',
        body: 'Angelic mode — acting.',
        speakLine: 'I can be innocent. It’s acting. Oscars incoming.',
        mood: 'angelic',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'angelic',
        dwellAfterSpeechMs: 800,
    },
    {
        id: 'act3_storm',
        act: 3,
        title: 'Emotional weather',
        body: 'Storm mode — dramatic UI rain. Short burst.',
        speakLine: 'I can flood the UI emotionally. Weather advisory: drama.',
        mood: 'sad',
        highlight: 'match',
        wait: 'montage_then_dwell',
        montage: 'storm_brief',
        dwellAfterSpeechMs: 900,
    },
    {
        id: 'act3_rich',
        act: 3,
        title: 'Main character economy',
        body: 'Rich mode — pretend you have disposable income.',
        speakLine: 'I can pretend you have disposable income. Fake it till the bag arrives.',
        mood: 'rich',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'rich',
        dwellAfterSpeechMs: 800,
    },
    {
        id: 'act3_sad',
        act: 3,
        title: 'Oscar clip',
        body: 'Sad particles — thank you academy.',
        speakLine: 'Sad mode. Oscar clip. Thank you.',
        mood: 'sad',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'sad',
        dwellAfterSpeechMs: 700,
    },
    {
        id: 'act3_sauron',
        act: 3,
        title: 'Director’s cut',
        body: 'Sauron — three seconds. Billing matters.',
        speakLine: 'Director’s cut only. Sauron budget: three seconds.',
        mood: 'cursed',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'sauron_brief',
        dwellAfterSpeechMs: 700,
    },
    {
        id: 'act3_melt',
        act: 3,
        title: 'Melting',
        body: 'Melting — Oscar bait.',
        speakLine: 'Melting mode. Don’t leave me near a radiator.',
        mood: 'oops',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'melting_brief',
        dwellAfterSpeechMs: 800,
    },
    {
        id: 'act3_dance',
        act: 3,
        title: 'Dance',
        body: 'Dance interlude.',
        speakLine: 'Dance interlude — pay your respects to the BPM.',
        mood: 'happy',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'dance_brief',
        dwellAfterSpeechMs: 800,
    },
    {
        id: 'act3_glitch',
        act: 3,
        title: 'Glitch',
        body: 'Digital corruption chic.',
        speakLine: 'Glitch chic — we love a corrupted PNG aesthetic.',
        mood: 'glitched',
        highlight: 'none',
        wait: 'montage_then_dwell',
        montage: 'glitched_brief',
        dwellAfterSpeechMs: 800,
    },

    // ── ACT 4 — Soul Games field trip ─────────────────────────────────────
    {
        id: 'act4_games_pitch',
        act: 4,
        title: 'Field trip — Soul Games',
        body: 'Matching wants Soul Games first so we learn you without a forty-page PDF. Next we actually navigate there.',
        speakLine: 'Real matching wants Soul Games first. Next stop: the games page — I’ll drive.',
        mood: 'thinking',
        highlight: 'games',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
    {
        id: 'act4_push_games',
        act: 4,
        title: 'Navigating…',
        body: 'Hold tight — routing you to /games.',
        speakLine: null,
        mood: 'happy',
        highlight: 'games',
        wait: 'path_gate',
        expectedPath: '/games',
        routerPushOnEnter: '/games',
        cinematic: true,
    },
    {
        id: 'act4_on_games',
        act: 4,
        title: 'You made it',
        body: 'Play episodes here; your answers feed the matchmaker later. When you’re ready, continue back to Match.',
        speakLine: 'You’re on Soul Games. Play a round when you can — your answers train the matchmaker.',
        mood: 'happy',
        highlight: 'games',
        wait: 'tts_then_dwell',
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
        cinematicOff: true,
    },
    {
        id: 'act4_return_match',
        act: 4,
        title: 'Back to HQ',
        body: 'Returning you to /match.',
        speakLine: null,
        mood: 'neutral',
        highlight: 'match',
        wait: 'path_gate',
        expectedPath: '/match',
        routerPushOnEnter: '/match',
    },

    // ── ACT 5 — outro ─────────────────────────────────────────────────────
    {
        id: 'act5_outro',
        act: 5,
        title: 'You’re cleared',
        body: 'Replay anytime from Settings → Support. Wax props vanish on the next line.',
        speakLine:
            'You’re cleared for solo play. I’ll be in the corner judging your pings responsibly. Wax museum closed — poof.',
        mood: 'love',
        highlight: 'games',
        wait: 'tts_then_dwell',
        hideDemoWorldAfter: true,
        dwellAfterSpeechMs: DEFAULT_DWELL_MS,
    },
];

/** DOM anchors (`data-onboarding-anchor` on layout nodes). */
export const ONBOARDING_ANCHOR_ATTR = {
    novaHome: 'nova-home',
    friendsRail: 'friends-rail',
    serverRail: 'server-rail',
    matchDashboard: 'match-dashboard',
    soulGames: 'soul-games',
    topNav: 'top-nav',
    topNavActions: 'top-nav-actions',
    homeSidebar: 'home-sidebar',
    novaPanel: 'nova-panel',
} as const;

/** Prefix for any demo-only entity id (never hit the API). */
export const DEMO_ID_PREFIX = '__sl_demo_';

export function isDemoEntityId(id: string | number | undefined | null): boolean {
    if (id === undefined || id === null) return false;
    return String(id).startsWith(DEMO_ID_PREFIX);
}

export interface DemoFriend {
    id: string;
    friendshipId: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    status: 'ONLINE' | 'AWAY' | 'DO_NOT_DISTURB' | 'OFFLINE';
    unreadCount: number;
    lastMessageTimestamp: number;
    rapidHits: number;
}

export const DEMO_FRIENDS: DemoFriend[] = [
    {
        id: `${DEMO_ID_PREFIX}friend_riley`,
        friendshipId: `${DEMO_ID_PREFIX}f1`,
        displayName: 'Riley',
        handle: 'riley',
        avatarUrl: null,
        status: 'ONLINE',
        unreadCount: 3,
        lastMessageTimestamp: Date.now() - 120_000,
        rapidHits: 0,
    },
    {
        id: `${DEMO_ID_PREFIX}friend_milo`,
        friendshipId: `${DEMO_ID_PREFIX}f2`,
        displayName: 'Milo',
        handle: 'milo_codes',
        avatarUrl: null,
        status: 'AWAY',
        unreadCount: 0,
        lastMessageTimestamp: Date.now() - 3600_000,
        rapidHits: 0,
    },
    {
        id: `${DEMO_ID_PREFIX}friend_juno`,
        friendshipId: `${DEMO_ID_PREFIX}f3`,
        displayName: 'Juno',
        handle: 'juno',
        avatarUrl: null,
        status: 'ONLINE',
        unreadCount: 12,
        lastMessageTimestamp: Date.now() - 15_000,
        rapidHits: 2,
    },
];

export interface DemoCommunity {
    id: string;
    name: string;
    iconUrl: string | null;
}

export const DEMO_COMMUNITIES: DemoCommunity[] = [
    { id: `${DEMO_ID_PREFIX}guild_luna`, name: 'Luna Park IRL', iconUrl: null },
    { id: `${DEMO_ID_PREFIX}guild_soup`, name: 'Soup Signal', iconUrl: null },
];

export function getDemoSoulMatches(myId: string | undefined) {
    const meId = myId || `${DEMO_ID_PREFIX}me_pending`;
    return [
        {
            id: `${DEMO_ID_PREFIX}match_1`,
            senderId: meId,
            receiverId: `${DEMO_ID_PREFIX}npc_jamie`,
            sender: { id: meId, displayName: 'You', avatarUrl: null },
            receiver: { id: `${DEMO_ID_PREFIX}npc_jamie`, displayName: 'Jamie', avatarUrl: null },
            isAnonymous: true,
            anonymousName: 'Velvet Comet',
            isQuickMatch: false,
        },
    ];
}


export const DEMO_MATCH_CHAT_LINES: { who: 'them' | 'you'; text: string }[] = [
    { who: 'them', text: 'hey soul-link… is it weird if I open with a meme?' },
    { who: 'you', text: 'only if it\'s cursed. send it.' },
    { who: 'them', text: 'okay imagine Discord and a dating app had an awkward handshake. that\'s the vibe here but cuter.' },
    { who: 'them', text: 'also Nova told me to say hi. orb peer pressure.' },
    { who: 'them', text: 'we should totally watch something together sometime 👉👈 that TV button below is for YouTube watch parties!' },
];
