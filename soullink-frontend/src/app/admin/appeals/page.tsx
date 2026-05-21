'use client';

/**
 * Admin Appeals Page — /admin/appeals
 * CDC: EF-072 — Admins manage appeals and disputes
 *
 * Shows all platform appeals with full context.
 * Admins can override moderator decisions (accept/reject) with notes.
 */

import { useEffect, useState, useCallback } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import { ConfirmationModal, InputModal } from '@/components/admin/AdminModal';
import styles from '../reports/reports.module.css';
import { Scale, AlertTriangle, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    PENDING:  '#FFD700',
    ACCEPTED: '#32CD32',
    REJECTED: '#FF4444',
};

export default function AdminAppealsPage() {
    const [appeals, setAppeals] = useState<any[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(1);
    const [status,  setStatus]  = useState('');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', isDanger: false, action: () => {} });
    const [inputModal, setInputModal]     = useState({ isOpen: false, title: '', message: '', isDanger: false, action: (val: string) => {} });

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            // Admin sees all appeals via the admin reports endpoint
            const qs = new URLSearchParams({ page: String(page), limit: '20', ...(status ? { status } : {}) }).toString();
            const data = await adminApi.listAppeals({ page: String(page), limit: '20', ...(status ? { status } : {}) });
            setAppeals(data.appeals ?? []);
            setTotal(data.total ?? 0);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [page, status]);

    useEffect(() => { load(); }, [load]);

    const handleAccept = (appealId: string, userName: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Accept Appeal (Admin Override)',
            message: `Override and accept the appeal from ${userName}? Any active sanctions will be reversed.`,
            isDanger: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.resolveAppeal(appealId, 'ACCEPTED'); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const handleReject = (appealId: string) => {
        setInputModal({
            isOpen: true,
            title: 'Reject Appeal (Admin Override)',
            message: 'Provide an admin note explaining the rejection:',
            isDanger: true,
            action: async (notes: string) => {
                setInputModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.resolveAppeal(appealId, 'REJECTED', notes); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const pages = Math.ceil(total / 20);

    return (
        <div className={styles.shell}>
            <AdminSidebar />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.title}>
                        <span className={styles.titleIcon}><Scale size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} /></span>Appeals Management
                    </h1>
                    <span className={styles.count}>{total.toLocaleString()} total</span>
                </header>

                <div className={styles.filters}>
                    <select
                        id="appeal-status-filter"
                        className={styles.select}
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        aria-label="Filter appeals by status"
                    >
                        <option value="">All statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                {error && (
                    <div className={styles.errorBanner} role="alert">
                        <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                        {error}
                    </div>
                )}

                <div className={styles.tableWrapper} role="region" aria-label="Appeals table">
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">Appellant</th>
                                <th scope="col">Violation</th>
                                <th scope="col">Reason</th>
                                <th scope="col">Status</th>
                                <th scope="col">Original Action</th>
                                <th scope="col">Date</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} aria-hidden="true">
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j}><div className={styles.skeleton} /></td>
                                        ))}
                                    </tr>
                                ))
                                : appeals.length === 0
                                ? <tr><td colSpan={7} className={styles.empty}>No appeals found</td></tr>
                                : appeals.map(a => (
                                    <tr key={a.id} className={styles.row}>
                                        <td><div className={styles.displayName}>{a.user?.displayName || '—'}</div><div className={styles.handle}>@{a.user?.handle}</div></td>
                                        <td><span className={styles.chip} style={{ color: '#A0A0B5', borderColor: 'rgba(160,160,181,0.3)' }}>{a.report?.category ?? '—'}</span></td>
                                        <td style={{ maxWidth: 220 }}><div style={{ fontSize: 13, color: '#D0D0E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.reason}>{a.reason || '—'}</div></td>
                                        <td>
                                            <span className={styles.chip} style={{ color: STATUS_COLORS[a.status] ?? '#A0A0B5', borderColor: (STATUS_COLORS[a.status] ?? '#A0A0B5') + '44' }}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: '#A0A0B5' }}>{a.report?.modActions?.[0]?.action ?? '—'}</td>
                                        <td className={styles.date}>{new Date(a.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {a.status === 'PENDING' && (
                                                <div className={styles.actions}>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.success}`}
                                                        onClick={() => handleAccept(a.id, a.user?.displayName ?? 'this user')}
                                                        title="Accept Appeal"
                                                        aria-label={`Accept appeal from ${a.user?.displayName}`}
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.danger}`}
                                                        onClick={() => handleReject(a.id)}
                                                        title="Reject Appeal"
                                                        aria-label={`Reject appeal from ${a.user?.displayName}`}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            {a.status !== 'PENDING' && <span style={{ fontSize: 12, color: '#606075' }}>Resolved</span>}
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                </div>

                {pages > 1 && (
                    <nav className={styles.pagination} aria-label="Appeals pagination">
                        <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={14} /></button>
                        <span className={styles.pageInfo}>{page} / {pages}</span>
                        <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} aria-label="Next page"><ChevronRight size={14} /></button>
                    </nav>
                )}
            </main>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
                isSuccess={!confirmModal.isDanger}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <InputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                message={inputModal.message}
                inputType="textarea"
                isDanger={inputModal.isDanger}
                onConfirm={inputModal.action}
                onCancel={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
