export const HEART_PATHS = {
    circleLeft: "M 24 0 A 24 24 0 0 0 24 48 L 24 24 Z",
    circleRight: "M 24 0 A 24 24 0 0 1 24 48 L 24 24 Z",
    heartLeft: "M 24 42 C 10 32 0 20 0 11 C 0 5 5 0 11 0 C 15 0 19 2 24 6 L 24 42 Z",
    heartRight: "M 24 42 C 38 32 48 20 48 11 C 48 5 43 0 37 0 C 33 0 29 2 24 6 L 24 42 Z"
};

export function getColors(mood: string, isHeartbroken: boolean, isSingularity: boolean, isNightMode: boolean, isSauronMode: boolean, isMelting: boolean, pulseActive: number) {
    if (isSauronMode) return {
        core1: "#ff3300", core2: "#ffcc00",
        aura: "rgba(255, 50, 0, 0.4)", eye: "#000000",
        iris: "#ffcc00", background: "rgba(50, 10, 0, 0.9)"
    };
    if (isNightMode) return {
        core1: "#e0e7ff", core2: "#a5b4fc",
        aura: "rgba(165, 180, 252, 0.4)", eye: "#1e1b4b",
        iris: "#c7d2fe", background: "rgba(30, 27, 75, 0.9)"
    };
    if (isHeartbroken) return {
        core1: "#475569", core2: "#1e293b",
        aura: "rgba(71, 85, 105, 0.2)", eye: "#0f172a", iris: "#94a3b8"
    };
    if (isMelting) return {
        core1: "#b91c1c", core2: "#7f1d1d",
        aura: "rgba(220, 38, 38, 0.6)", eye: "#450a0a", iris: "#fca5a5"
    };

    switch (mood) {
        case "love":
            return {
                core1: "#f43f5e",
                core2: "#fbbf24",
                aura: "rgba(244, 63, 94, 0.4)",
                eye: "#ffffff",
                iris: "#881337"
            };
        case "rich":
            return {
                core1: "#ffd700",
                core2: "#b8860b",
                aura: "rgba(255, 215, 0, 0.5)",
                eye: "#000000",
                iris: "#ffd700"
            };
        case "angry":
            return {
                core1: "#ef4444",
                core2: "#7f1d1d",
                aura: "rgba(239, 68, 68, 0.5)",
                eye: "#ffffff",
                iris: "#450a0a"
            };
        case "happy":
            return {
                core1: "#fde047",
                core2: "#f59e0b",
                aura: "rgba(253, 224, 71, 0.5)",
                eye: "#78350f",
                iris: "#fef3c7"
            };
        case "surprised":
            return {
                core1: "#38bdf8",
                core2: "#0284c7",
                aura: "rgba(56, 189, 248, 0.4)",
                eye: "#ffffff",
                iris: "#082f49"
            };
        case "thinking":
            return {
                core1: "#a78bfa",
                core2: "#8b5cf6",
                aura: "rgba(167, 139, 250, 0.4)",
                eye: "#ffffff",
                iris: "#4c1d95"
            };
        case "curious":
            return {
                core1: "#34d399",
                core2: "#059669",
                aura: "rgba(52, 211, 153, 0.4)",
                eye: "#ffffff",
                iris: "#064e3b"
            };
        case "sad":
            return {
                core1: "#64748b",
                core2: "#334155",
                aura: "rgba(100, 116, 139, 0.3)",
                eye: "#f8fafc",
                iris: "#0f172a"
            };
        case "disgusted":
            return {
                core1: "#a3e635",
                core2: "#4d7c0f",
                aura: "rgba(163, 230, 53, 0.4)",
                eye: "#14532d",
                iris: "#d9f99d"
            };
        case "bored":
            return {
                core1: "#cbd5e1",
                core2: "#94a3b8",
                aura: "rgba(203, 213, 225, 0.2)",
                eye: "#334155",
                iris: "#f1f5f9"
            };
        case "angelic":
            return {
                core1: "#ffffff",
                core2: "#fef08a",
                aura: "rgba(255, 255, 255, 0.8)",
                eye: "#fef08a",
                iris: "#ca8a04",
                background: "rgba(255, 255, 255, 0.9)"
            };
        case "crazy":
            return {
                core1: "#ff00ff",
                core2: "#00ffff",
                aura: "rgba(255, 0, 255, 0.6)",
                eye: "#ffff00",
                iris: "#ff0000"
            };
        case "cursed":
            return {
                core1: "#000000",
                core2: "#8b0000",
                aura: "rgba(139, 0, 0, 0.6)",
                eye: "#ff0000",
                iris: "#000000"
            };
        case "broken":
            return {
                core1: "#475569",
                core2: "#1e293b",
                aura: "rgba(71, 85, 105, 0.2)",
                eye: "#0f172a",
                iris: "#94a3b8" // Dull gray
            };
        default:
            return {
                // Neutral state incorporates pulse trigger for mild brightness pop
                core1: pulseActive ? "#e9d5ff" : "#d8b4fe",
                core2: pulseActive ? "#d8b4fe" : "#9d50bb",
                aura: `rgba(157, 80, 187, ${pulseActive ? 0.6 : 0.3})`,
                eye: "#ffffff",
                iris: "#4c1d95"
            };
    }
}
