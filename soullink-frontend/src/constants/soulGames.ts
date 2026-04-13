export type SoulGameTheme = 'personality' | 'love' | 'philosophy' | 'growth';

export interface SoulGameScene {
    id: string;
    text: string;
    bgImage?: string;
    novaComment: string;
    novaMood: string;
    choices: {
        text: string;
        themeColor: string;
        icon?: string;
        reflectionPrompt: string;
    }[];
}

export interface SoulGame {
    id: string;
    title: string;
    description: string;
    theme: SoulGameTheme;
    color: string;
    icon: string;
    mandatory: boolean;
    scenes: SoulGameScene[];
}

export const SOUL_GAMES: SoulGame[] = [
    {
        id: "inner-crossroads",
        title: "Inner Crossroads",
        description: "Explore your Big Five traits through daily scenarios.",
        theme: "personality",
        color: "#FACC15", // Softer Yellow
        icon: "🧠",
        mandatory: true,
        scenes: [
            {
                id: "sc-1",
                text: "You wake up to a free day. What do you notice first?",
                novaComment: "Take your time – this reveals your openness.",
                novaMood: "curious",
                choices: [
                    { text: "🌸 Flowers", themeColor: "#FACC15", reflectionPrompt: "Nature brings peace. Why do you feel drawn to the organic?" },
                    { text: "📚 Quiet", themeColor: "#3B82F6", reflectionPrompt: "Silence speaks volumes. What does your heart seek in the quiet?" },
                    { text: "🎵 Melody", themeColor: "#4ADE80", reflectionPrompt: "Why the melody? Share..." }
                ]
            }
        ]
    },
    {
        id: "heart-echoes",
        title: "Heart Echoes",
        description: "Discover your relationship values & compatibility styles.",
        theme: "love",
        color: "#F43F5E", // Rose Red
        icon: "❤️",
        mandatory: false,
        scenes: []
    },
    {
        id: "value-labyrinth",
        title: "Value Labyrinth",
        description: "Reflect on life values & philosophical choices.",
        theme: "philosophy",
        color: "#6366F1", // Indigo
        icon: "📖",
        mandatory: false,
        scenes: []
    },
    {
        id: "soul-evolution",
        title: "Soul Evolution",
        description: "Track patterns from past games & suggest next steps.",
        theme: "growth",
        color: "#10B981", // Emerald
        icon: "📈",
        mandatory: false,
        scenes: []
    }
];
