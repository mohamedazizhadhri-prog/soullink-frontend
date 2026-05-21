'use client';

/**
 * Admin Communities Page — /admin/communities
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §3.6
 */

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import { ConfirmationModal } from '@/components/admin/AdminModal';
import styles from './communities.module.css';
import { Globe, AlertTriangle, Lock, Unlock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminCommunitiesPage() {
    const [servers, setServers] = useState<any[]>([]);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: () => {} });


    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const data = await adminApi.listServers({ page, limit: 20 });
            setServers(data.servers ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { load(); }, [load]);

    const handleDissolve = (id: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Dissolve Community',
            message: `Are you sure you want to dissolve the server "${name}"? This cannot be undone.`,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.dissolveServer(id); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const handleToggleVisibility = async (id: string, isPublic: boolean) => {
        try { await adminApi.toggleServerVisibility(id, !isPublic); load(); }
        catch (e: any) { alert('Error: ' + e.message); }
    };

    const pages = Math.ceil(total / 20);

    return (
        <div className={styles.shell}>
            <AdminSidebar />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}><Globe size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} /></span>Communities
                    </h1>
                    <span className={styles.count}>{total.toLocaleString()} total</span>
                </header>

                {error && (
                    <div className={styles.errorBanner} role="alert">
                        <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className={styles.grid}>
                        {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeleton} aria-hidden="true" />)}
                    </div>
                ) : servers.length === 0 ? (
                    <div className={styles.empty}>No communities found.</div>
                ) : (
                    <>
                        <div className={styles.grid}>
                            {servers.map((s: any) => (
                                <article key={s.id} className={styles.modCard}>
                                    <div className={styles.modHeader}>
                                        <div className={styles.avatar} style={{ borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {s.iconUrl
                                                ? <img src={s.iconUrl} alt="" width={44} height={44} style={{ borderRadius: '10px' }} />
                                                : <Globe size={20} />
                                            }
                                        </div>
                                        <div>
                                            <div className={styles.modName}>{s.name}</div>
                                            <div className={styles.modHandle} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {s.isPublic ? (
                                                    <><Unlock size={12} /> <span>Public</span></>
                                                ) : (
                                                    <><Lock size={12} /> <span>Private</span></>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.statRow}>
                                        <div className={styles.stat}>
                                            <span className={styles.statVal}>{s._count?.members ?? 0}</span>
                                            <span className={styles.statLabel}>Members</span>
                                        </div>
                                        <div className={styles.stat}>
                                            <span className={styles.statVal}>{s._count?.channels ?? 0}</span>
                                            <span className={styles.statLabel}>Channels</span>
                                        </div>
                                    </div>

                                    <div className={styles.cardActions}>
                                        <button
                                            className={styles.viewBtn}
                                            onClick={() => handleToggleVisibility(s.id, s.isPublic)}
                                            id={`toggle-vis-${s.id}`}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                                        >
                                            {s.isPublic ? <Lock size={12} /> : <Unlock size={12} />}
                                            <span>{s.isPublic ? 'Make Private' : 'Make Public'}</span>
                                        </button>
                                        <button
                                            className={styles.demoteBtn}
                                            onClick={() => handleDissolve(s.id, s.name)}
                                            id={`dissolve-${s.id}`}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                                        >
                                            <Trash2 size={12} />
                                            <span>Dissolve</span>
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
 
                        {pages > 1 && (
                            <nav className={styles.pagination} aria-label="Pagination">
                                <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></button>
                                <span className={styles.pageInfo}>{page} / {pages}</span>
                                <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} aria-label="Next page"><ChevronRight size={14} /></button>
                            </nav>
                        )}
                    </>
                )}
            </main>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={true}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
