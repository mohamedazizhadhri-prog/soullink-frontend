"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Theme Definitions ─────────────────────────────────────────────────────────

export interface ThemeMeta {
    id: string;
    name: string;
    description: string;
    preview: {
        bg: string;
        card: string;
        accent: string;
        text: string;
    };
    category: "dark" | "light" | "special";
}

export const THEMES: ThemeMeta[] = [
    {
        id: "void",
        name: "Void",
        description: "The original SoulLink dark theme",
        preview: { bg: "#0F0F1A", card: "#1E1E2E", accent: "#7B68EE", text: "#F0F0F5" },
        category: "dark",
    },
    {
        id: "midnight-ocean",
        name: "Midnight Ocean",
        description: "Deep blue tones inspired by the abyss",
        preview: { bg: "#0A1628", card: "#112240", accent: "#64FFDA", text: "#CCD6F6" },
        category: "dark",
    },
    {
        id: "aurora",
        name: "Aurora",
        description: "Northern lights in the polar sky",
        preview: { bg: "#0B1A1A", card: "#12302C", accent: "#00E5A0", text: "#D0F0E8" },
        category: "dark",
    },
    {
        id: "sunset",
        name: "Sunset Ember",
        description: "Warm hues of a golden hour sky",
        preview: { bg: "#1A0F0F", card: "#2E1A1A", accent: "#FF7B54", text: "#F5E6D8" },
        category: "dark",
    },
    {
        id: "cyberpunk",
        name: "Cyberpunk",
        description: "Neon-soaked streets of the future",
        preview: { bg: "#0D0D0D", card: "#1A1A2E", accent: "#FF2E97", text: "#EAEAEA" },
        category: "dark",
    },
    {
        id: "lavender",
        name: "Lavender Dream",
        description: "Soft and dreamy purple pastels",
        preview: { bg: "#1A1525", card: "#262038", accent: "#C4A7FF", text: "#E8E0F0" },
        category: "dark",
    },
    {
        id: "ivory",
        name: "Ivory",
        description: "Clean and minimal light theme",
        preview: { bg: "#F5F5F0", card: "#FFFFFF", accent: "#6C5CE7", text: "#2D3436" },
        category: "light",
    },
    {
        id: "crimson",
        name: "Crimson Abyss",
        description: "Dark and intense blood-red aesthetic",
        preview: { bg: "#0A0A0A", card: "#1A0A0A", accent: "#DC143C", text: "#E8D0D0" },
        category: "dark",
    },
];

// ─── Context ────────────────────────────────────────────────────────────────────

interface ThemeContextValue {
    themeId: string;
    theme: ThemeMeta;
    setTheme: (id: string) => void;
    accentColor: string;
    setAccentColor: (color: string) => void;
    fontSize: "small" | "medium" | "large";
    setFontSize: (size: "small" | "medium" | "large") => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "sl_theme";
const ACCENT_KEY = "sl_accent";
const FONT_SIZE_KEY = "sl_font_size";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeId, setThemeId] = useState("void");
    const [accentColor, setAccentColorState] = useState("");
    const [fontSize, setFontSizeState] = useState<"small" | "medium" | "large">("medium");
    const [mounted, setMounted] = useState(false);

    // Load saved preferences on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && THEMES.find(t => t.id === saved)) {
            setThemeId(saved);
        }
        const savedAccent = localStorage.getItem(ACCENT_KEY);
        if (savedAccent) setAccentColorState(savedAccent);

        const savedFont = localStorage.getItem(FONT_SIZE_KEY) as "small" | "medium" | "large" | null;
        if (savedFont) setFontSizeState(savedFont);

        setMounted(true);
    }, []);

    // Apply theme class to <html> whenever themeId changes
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        // Remove all theme classes
        THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
        // Add active theme class
        root.classList.add(`theme-${themeId}`);
        // Persist
        localStorage.setItem(STORAGE_KEY, themeId);
    }, [themeId, mounted]);

    // Apply custom accent color
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        if (accentColor) {
            root.style.setProperty("--color-brand-purple", accentColor);
            localStorage.setItem(ACCENT_KEY, accentColor);
        } else {
            root.style.removeProperty("--color-brand-purple");
            localStorage.removeItem(ACCENT_KEY);
        }
    }, [accentColor, mounted]);

    // Apply font size
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        const sizes = { small: "14px", medium: "16px", large: "18px" };
        root.style.setProperty("--font-size-base", sizes[fontSize]);
        root.style.fontSize = sizes[fontSize];
        localStorage.setItem(FONT_SIZE_KEY, fontSize);
    }, [fontSize, mounted]);

    const setTheme = useCallback((id: string) => {
        if (THEMES.find(t => t.id === id)) {
            setThemeId(id);
            // Reset accent when changing theme so the theme's accent takes over
            setAccentColorState("");
        }
    }, []);

    const setAccentColor = useCallback((color: string) => {
        setAccentColorState(color);
    }, []);

    const setFontSize = useCallback((size: "small" | "medium" | "large") => {
        setFontSizeState(size);
    }, []);

    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

    return (
        <ThemeContext.Provider value={{ themeId, theme, setTheme, accentColor, setAccentColor, fontSize, setFontSize }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}

export function useThemeOptional() {
    return useContext(ThemeContext);
}
