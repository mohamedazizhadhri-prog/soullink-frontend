'use client';

/**
 * Admin Feedback Page — /admin/feedback
 *
 * Displays all user-submitted feedback with:
 *  - Status filter tabs (ALL / PENDING / REPLIED / CLOSED)
 *  - Search bar
 *  - Category badge per item
 *  - Inline reply form
 *  - Close action
 */

import React, { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import styles from './page.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackUser {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
}

interface FeedbackItem {
    id: string;
    title: string;
    content: string;
    category: 'BUG' | 'IDEA' | 'IMPROVEMENT' | 'OTHER';
    status: 'PENDING' | 'REPLIED' | 'CLOSED';
    reply: string | null;
    repliedAt: string | null;
    createdAt: string;
    user: FeedbackUser;
}

type StatusFilter = 'ALL' | 'PENDING' | 'REPLIED' | 'CLOSED';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
    BUG:         { icon: '🐛', color: '#FF6B6B' },
    IDEA:        { icon: '💡', color: '#FFD700' },
    IMPROVEMENT: { icon: '⚡', color: '#00BFFF' },
    OTHER:       { icon: '💬', color: '#A0A0B5' },
};

const STATUS_TABS: StatusFilter[] = ['ALL', 'PENDING', 'REPLIED', 'CLOSED'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
    const [feedbacks,    setFeedbacks]    = useState<FeedbackItem[]>([]);
    const [total,        setTotal]        = useState(0);
    const [page,         setPage]         = useState(1);
    const [pages,        setPages]        = useState(1);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [search,       setSearch]       = useState('');
    const [searchInput,  setSearchInput]  = useState('');
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState<string | null>(null);

    // Per-item reply state
    const [replyingTo,   setReplyingTo]   = useState<string | null>(null);
    const [replyText,    setReplyText]    = useState('');
    const [submitting,   setSubmitting]   = useState(false);

    // ── Data fetching ─────────────────────────────────────────────────────────

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = { page, limit: 15 };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (search) params.search = search;

            const data = await adminApi.listFeedback(params);
            setFeedbacks(data.feedbacks ?? []);
            setTotal(data.total ?? 0);
            setPages(data.pages ?? 1);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search]);

    useEffect(() => { load(); }, [load]);

    // Reset to page 1 when filter/search changes
    useEffect(() => { setPage(1); }, [statusFilter, search]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleReply = async (id: string) => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            await adminApi.replyToFeedback(id, replyText.trim());
            setReplyingTo(null);
            setReplyText('');
            load();
        } catch (e: any) {
            alert('Reply failed: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = async (id: string) => {
        if (!confirm('Mark this feedback as closed?')) return;
        try {
            await adminApi.closeFeedback(id);
            load();
        } catch (e: any) {
            alert('Close failed: ' + e.message);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput.trim());
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={styles.shell}>
            <AdminSidebar />

            <main className={styles.main}>
                {/* Header */}
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>💬 User Feedback</h1>
                        <p className={styles.subtitle}>
                            {total} submission{total !== 1 ? 's' : ''} total
                        </p>
                    </div>
                    <span className={styles.badge}>ADMIN</span>
                </header>

                {/* Search */}
                <form onSubmit={handleSearch} className={styles.searchRow} role="search">
                    <input
                        className={styles.searchInput}
                        type="search"
                        placeholder="Search by title or content…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        aria-label="Search feedback"
                    />
                    <button type="submit" className={styles.searchBtn}>Search</button>
                    {search && (
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={() => { setSearch(''); setSearchInput(''); }}
                        >
                            Clear
                        </button>
                    )}
                </form>

                {/* Status Tabs */}
                <nav className={styles.tabs} role="tablist" aria-label="Feedback status filter">
                    {STATUS_TABS.map(s => (
                        <button
                            key={s}
                            role="tab"
                            aria-selected={statusFilter === s}
                            className={`${styles.tab} ${statusFilter === s ? styles.activeTab : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </nav>

                {/* Error */}
                {error && (
                    <div className={styles.errorBanner} role="alert">⚠️ {error}</div>
                )}

                {/* List */}
                {loading ? (
                    <div className={styles.loadingGrid}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={styles.skeleton} aria-hidden="true" />
                        ))}
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon}>📭</span>
                        <p>No feedback found</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {feedbacks.map(fb => {
                            const cat = CATEGORY_META[fb.category] ?? CATEGORY_META.OTHER;
                            const isReplying = replyingTo === fb.id;

                            return (
                                <article key={fb.id} className={styles.card}>
                                    {/* Card top row */}
                                    <div className={styles.cardTop}>
                                        <span
                                            className={styles.categoryBadge}
                                            style={{ background: cat.color + '22', color: cat.color, borderColor: cat.color + '55' }}
                                        >
                                            {cat.icon} {fb.category}
                                        </span>
                                        <span className={`${styles.statusBadge} ${styles['status_' + fb.status]}`}>
                                            {fb.status}
                                        </span>
                                        <span className={styles.date}>
                                            {new Date(fb.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </span>
                                    </div>

                                    {/* User info */}
                                    <div className={styles.userRow}>
                                        {fb.user.avatarUrl ? (
                                            <img
                                                src={fb.user.avatarUrl}
                                                alt=""
                                                className={styles.avatar}
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <div className={styles.avatarFallback} aria-hidden="true">
                                                {fb.user.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <span className={styles.userName}>{fb.user.displayName}</span>
                                            <span className={styles.userHandle}>@{fb.user.handle}</span>
                                        </div>
                                    </div>

                                    {/* Title + content */}
                                    <h3 className={styles.feedbackTitle}>{fb.title}</h3>
                                    <p className={styles.feedbackContent}>{fb.content}</p>

                                    {/* Existing reply */}
                                    {fb.reply && (
                                        <div className={styles.existingReply}>
                                            <span className={styles.replyLabel}>✉️ Admin reply</span>
                                            <p className={styles.replyText}>{fb.reply}</p>
                                            {fb.repliedAt && (
                                                <span className={styles.replyDate}>
                                                    {new Date(fb.repliedAt).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Inline reply form */}
                                    {isReplying && (
                                        <div className={styles.replyForm}>
                                            <textarea
                                                className={styles.replyTextarea}
                                                placeholder="Write your reply…"
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                rows={3}
                                                autoFocus
                                                aria-label="Reply text"
                                            />
                                            <div className={styles.replyFormActions}>
                                                <button
                                                    className={styles.sendBtn}
                                                    onClick={() => handleReply(fb.id)}
                                                    disabled={submitting || !replyText.trim()}
                                                >
                                                    {submitting ? 'Sending…' : '✉️ Send Reply'}
                                                </button>
                                                <button
                                                    className={styles.cancelBtn}
                                                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {fb.status !== 'CLOSED' && (
                                        <div className={styles.actions}>
                                            {!isReplying && (
                                                <button
                                                    className={styles.replyBtn}
                                                    onClick={() => {
                                                        setReplyingTo(fb.id);
                                                        setReplyText(fb.reply ?? '');
                                                    }}
                                                >
                                                    {fb.reply ? '✏️ Edit Reply' : '✉️ Reply'}
                                                </button>
                                            )}
                                            <button
                                                className={styles.closeBtn}
                                                onClick={() => handleClose(fb.id)}
                                            >
                                                ✓ Close
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div className={styles.pagination} role="navigation" aria-label="Pagination">
                        <button
                            className={styles.pageBtn}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            ← Prev
                        </button>
                        <span className={styles.pageInfo}>Page {page} of {pages}</span>
                        <button
                            className={styles.pageBtn}
                            onClick={() => setPage(p => Math.min(pages, p + 1))}
                            disabled={page === pages}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
