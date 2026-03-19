// Registry of UI elements that Nova can eat
export const EATABLE_TARGETS = [
    { id: "soullink-logo", label: "SoulLink Logo", selector: ".logoArea" },
    { id: "search-bar", label: "Search Bar", selector: ".searchArea" },
    { id: "settings-icon", label: "Settings Icon", selector: "a[href='/settings']" },
    { id: "profile-avatar", label: "Profile Avatar", selector: "a[href='/profile']" },
    { id: "bell-icon", label: "Notification Bell", selector: "button:has(svg)" }, // First button with Bell
] as const;

export type EatableTargetId = typeof EATABLE_TARGETS[number]["id"];
