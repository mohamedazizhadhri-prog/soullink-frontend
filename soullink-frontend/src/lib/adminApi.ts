/**
 * Admin API Client — typed fetch wrappers
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6
 * 
 * All requests read the JWT from localStorage (set by login/page.tsx).
 * Base URL reads from NEXT_PUBLIC_API_URL env.
 */

// NEXT_PUBLIC_API_URL is set to http://localhost:4000/api in .env.local
// All paths in this file already include /api/... so we strip the trailing /api
const _rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const API_BASE = _rawBase.endsWith('/api') ? _rawBase.slice(0, -4) : _rawBase;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sl_token') : null;
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init?.headers,
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(err.message || `HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data as T;
}

// ── User Management ───────────────────────────────────────────────────────────

export const adminApi = {
    // §3.2 Users
    listUsers: (params?: Record<string, string | number>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return apiFetch<any>(`/api/admin/users${qs}`);
    },
    getUserDetail: (id: string) => apiFetch<any>(`/api/admin/users/${id}`),
    updateUser: (id: string, data: Record<string, any>) =>
        apiFetch<any>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteUser: (id: string, hard = false) =>
        apiFetch<any>(`/api/admin/users/${id}?hard=${hard}`, { method: 'DELETE' }),
    getUserLoginHistory: (id: string) => apiFetch<any>(`/api/admin/users/${id}/logins`),
    getUserModHistory:   (id: string) => apiFetch<any>(`/api/admin/users/${id}/actions`),
    banUser:   (id: string, reason: string) =>
        apiFetch<any>(`/api/admin/users/${id}/ban`,   { method: 'POST', body: JSON.stringify({ reason }) }),
    unbanUser: (id: string, reason: string) =>
        apiFetch<any>(`/api/admin/users/${id}/unban`, { method: 'POST', body: JSON.stringify({ reason }) }),
    clearFaceDescriptor: (id: string) =>
        apiFetch<any>(`/api/admin/users/${id}/clear-face`, { method: 'POST' }),

    // §3.3 Moderators
    listModerators:      () => apiFetch<any>('/api/admin/moderators'),
    getModeratorActions: (modId: string) => apiFetch<any>(`/api/admin/moderators/${modId}/actions`),

    // §3.4 Reports
    listReports:    (params?: Record<string, string | number>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return apiFetch<any>(`/api/admin/reports${qs}`);
    },
    getReportDetail: (id: string) => apiFetch<any>(`/api/admin/reports/${id}`),
    updateReport:    (id: string, data: Record<string, any>) =>
        apiFetch<any>(`/api/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    reverseModAction: (actionId: string, reason: string) =>
        apiFetch<any>(`/api/admin/mod-actions/${actionId}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) }),

    // §3.6 Communities
    listServers:    (params?: Record<string, string | number>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return apiFetch<any>(`/api/admin/communities${qs}`);
    },
    getServerDetail:       (id: string) => apiFetch<any>(`/api/admin/communities/${id}`),
    dissolveServer:        (id: string) => apiFetch<any>(`/api/admin/communities/${id}`, { method: 'DELETE' }),
    toggleServerVisibility:(id: string, isPublic: boolean) =>
        apiFetch<any>(`/api/admin/communities/${id}/visibility`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),

    // §3.7 Audit
    listAuditLogs:     (params?: Record<string, string>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/admin/audit-logs${qs}`);
    },
    listSystemLogs:    (params?: Record<string, string>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/admin/system-logs${qs}`);
    },
    listModLogs:       (params?: Record<string, string>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/admin/mod-logs${qs}`);
    },
    listSecurityLogs:  (params?: Record<string, string>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/admin/security-logs${qs}`);
    },
    listTokenBlacklist: () => apiFetch<any>('/api/admin/token-blacklist'),

    // §3.8 Settings
    listSoulGames:   () => apiFetch<any>('/api/admin/settings/soul-games'),
    toggleSoulGame:  (id: string, isActive: boolean) =>
        apiFetch<any>(`/api/admin/settings/soul-games/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    reorderSoulGame: (id: string, orderIndex: number) =>
        apiFetch<any>(`/api/admin/settings/soul-games/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ orderIndex }) }),

    // §3.10 Platform Config (EF-069)
    getConfig:    (group?: string) => {
        const qs = group ? `?group=${encodeURIComponent(group)}` : '';
        return apiFetch<any>(`/api/admin/config${qs}`);
    },
    updateConfig: (key: string, value: string | number | boolean) =>
        apiFetch<any>(`/api/admin/config/${encodeURIComponent(key)}`, {
            method: 'PATCH',
            body: JSON.stringify({ value: String(value) }),
        }),

    // §5 Analytics — All 6 domains + overview
    getSystemAnalytics:       (days = 30) => apiFetch<any>(`/api/analytics/system?days=${days}`),
    getUserAnalytics:         (days = 30) => apiFetch<any>(`/api/analytics/users?days=${days}`),
    getMatchingAnalytics:     (days = 30) => apiFetch<any>(`/api/analytics/matching?days=${days}`),
    getSoulGamesAnalytics:    ()          => apiFetch<any>('/api/analytics/soul-games'),
    getNovaAnalytics:         (days = 30) => apiFetch<any>(`/api/analytics/nova?days=${days}`),
    getCommunicationAnalytics:(days = 30) => apiFetch<any>(`/api/analytics/communication?days=${days}`),
    getModerationAnalytics:   (days = 30) => apiFetch<any>(`/api/analytics/moderation?days=${days}`),
    getCreditUsage:           ()          => apiFetch<any>('/api/analytics/credits'),
    refreshCredits:           ()          => apiFetch<any>('/api/analytics/credits/refresh', { method: 'POST' }),

    // §6 Appeals
    listAppeals: (params?: Record<string, string>) => {
        const qs = (params && typeof params === 'object' && Object.keys(params).length > 0) ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/admin/appeals${qs}`);
    },
    resolveAppeal: (id: string, decision: 'ACCEPTED' | 'REJECTED', notes?: string) =>
        apiFetch<any>(`/api/admin/appeals/${id}/resolve`, { method: 'POST', body: JSON.stringify({ decision, notes }) }),

    // §7 Feedback (admin/moderator)
    listFeedback: (params?: Record<string, string | number>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return apiFetch<any>(`/api/feedback${qs}`);
    },
    replyToFeedback: (id: string, reply: string) =>
        apiFetch<any>(`/api/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
    closeFeedback: (id: string) =>
        apiFetch<any>(`/api/feedback/${id}/close`, { method: 'POST' }),
};

// ── Moderation API ────────────────────────────────────────────────────────────

export const moderationApi = {
    // §4.1 Queue
    getQueue:       (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/moderation/queue${qs}`);
    },
    getReportDetail: (id: string) => apiFetch<any>(`/api/moderation/reports/${id}`),
    assignReport:    (id: string) => apiFetch<any>(`/api/moderation/reports/${id}/assign`, { method: 'POST' }),
    createModAction: (reportId: string, data: Record<string, any>) =>
        apiFetch<any>(`/api/moderation/reports/${reportId}/action`, { method: 'POST', body: JSON.stringify(data) }),
    dismissReport:   (id: string, reason: string) =>
        apiFetch<any>(`/api/moderation/reports/${id}/dismiss`, { method: 'POST', body: JSON.stringify({ reason }) }),

    // §4.2 Appeals
    listAppeals:     (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/moderation/appeals${qs}`);
    },
    getAppealDetail: (id: string) => apiFetch<any>(`/api/moderation/appeals/${id}`),
    resolveAppeal:   (id: string, decision: 'ACCEPTED' | 'REJECTED', notes?: string) =>
        apiFetch<any>(`/api/moderation/appeals/${id}/resolve`, { method: 'POST', body: JSON.stringify({ decision, notes }) }),

    // §4.4 My History
    getMyActions: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return apiFetch<any>(`/api/moderation/my-actions${qs}`);
    },

    // §4.5 Feedback (shared with admin)
    listFeedback: (params?: Record<string, string | number>) => {
        const qs = (params && typeof params === 'object') ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
        return apiFetch<any>(`/api/feedback${qs}`);
    },
    replyToFeedback: (id: string, reply: string) =>
        apiFetch<any>(`/api/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) }),
    closeFeedback: (id: string) =>
        apiFetch<any>(`/api/feedback/${id}/close`, { method: 'POST' }),
};
