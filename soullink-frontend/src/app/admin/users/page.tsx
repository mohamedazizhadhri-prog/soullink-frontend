'use client';

/**
 * Admin Users Page — /admin/users
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6.2
 *
 * Features:
 *  - Searchable / filterable paginated user table
 *  - Quick actions: view detail, ban, unban, delete
 *  - Role & status badge chips
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import { ConfirmationModal, InputModal } from '@/components/admin/AdminModal';
import styles from './users.module.css';
import { AlertTriangle, Eye, Ban, CheckCircle, Pause, Play, Trash2, Users } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
    ACTIVE:    '#32CD32',
    BANNED:    '#FF4444',
    SUSPENDED: '#FFD700',
    DELETED:   '#808080',
};

const ROLE_COLOR: Record<string, string> = {
    ADMIN:     '#7B68EE',
    MODERATOR: '#00BFFF',
    USER:      '#A0A0B5',
};

export default function AdminUsersPage() {
    const [users,   setUsers]   = useState<any[]>([]);
    const [total,   setTotal]   = useState(0);
    const [page,    setPage]    = useState(1);
    const [search,  setSearch]  = useState('');
    const [role,    setRole]    = useState('');
    const [status,  setStatus]  = useState('');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    // Modal States
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', isDanger: false, isWarn: false, action: () => {} });
    const [inputModal, setInputModal]     = useState({ isOpen: false, title: '', message: '', isDanger: false, inputType: 'text' as 'text'|'textarea'|'date', action: (val: string) => {} });


    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = { page, limit: 20 };
            if (search) params.search = search;
            if (role)   params.role   = role;
            if (status) params.status = status;
            const data = await adminApi.listUsers(params);
            setUsers(data.users);
            setTotal(data.total);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [page, search, role, status]);

    useEffect(() => { load(); }, [load]);

    const handleBan = (id: string) => {
        setInputModal({
            isOpen: true,
            title: 'Ban User',
            message: 'Enter the reason for banning this user:',
            isDanger: true,
            inputType: 'textarea',
            action: async (reason: string) => {
                setInputModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.banUser(id, reason); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const handleUnban = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Unban User',
            message: 'Are you sure you want to lift the ban on this user?',
            isDanger: false,
            isWarn: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.unbanUser(id, 'Admin unban'); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        });
    };

    const handleSuspend = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Suspend User',
            message: 'Are you sure you want to suspend this user?',
            isDanger: false,
            isWarn: true,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.updateUser(id, { status: 'SUSPENDED' }); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        })
    };

    const handleUnsuspend = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Suspension',
            message: 'Are you sure you want to reactivate this user?',
            isDanger: false,
            isWarn: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.updateUser(id, { status: 'ACTIVE' }); load(); }
                catch (e: any) { alert('Error: ' + e.message); }
            }
        })
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete User',
            message: 'Are you sure you want to soft-delete this user?',
            isDanger: true,
            isWarn: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try { await adminApi.deleteUser(id, false); load(); }
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
                    <h1 className={styles.title}><Users size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />User Management</h1>
                    <span className={styles.count}>{total.toLocaleString()} total</span>
                </header>

                {/* Filters */}
                <div className={styles.filters}>
                    <input
                        id="user-search"
                        type="search"
                        className={styles.searchInput}
                        placeholder="Search by name, handle or email…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        aria-label="Search users"
                    />
                    <select
                        id="user-role-filter"
                        className={styles.select}
                        value={role}
                        onChange={e => { setRole(e.target.value); setPage(1); }}
                        aria-label="Filter by role"
                    >
                        <option value="">All roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="USER">User</option>
                    </select>
                    <select
                        id="user-status-filter"
                        className={styles.select}
                        value={status}
                        onChange={e => { setStatus(e.target.value); setPage(1); }}
                        aria-label="Filter by status"
                    >
                        <option value="">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="BANNED">Banned</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="DELETED">Deleted</option>
                    </select>
                </div>

                {error && <div className={styles.errorBanner} role="alert"><AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{error}</div>}

                {/* Table */}
                <div className={styles.tableWrapper} role="region" aria-label="Users table">
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">User</th>
                                <th scope="col">Role</th>
                                <th scope="col">Status</th>
                                <th scope="col">Reports</th>
                                <th scope="col">Joined</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} aria-hidden="true">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j}><div className={styles.skeleton} /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.empty}>No users found</td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className={styles.row}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <div className={styles.avatar} aria-hidden="true">
                                                {user.avatarUrl
                                                    ? <img src={user.avatarUrl} alt="" width={32} height={32} />
                                                    : <span>{(user.displayName || '?')[0].toUpperCase()}</span>
                                                }
                                            </div>
                                            <div>
                                                <div className={styles.displayName}>{user.displayName || '—'}</div>
                                                <div className={styles.handle}>@{user.handle}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.chip} style={{ color: ROLE_COLOR[user.role], borderColor: ROLE_COLOR[user.role] + '44' }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.chip} style={{ color: STATUS_COLOR[user.status], borderColor: STATUS_COLOR[user.status] + '44' }}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className={styles.number}>{user._count?.receivedReports ?? 0}</td>
                                    <td className={styles.date}>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <Link href={`/admin/users/${user.id}`} className={styles.actionBtn} title="View detail">
                                                <Eye size={14} />
                                            </Link>
                                            {user.status === 'BANNED'
                                                ? <button onClick={() => handleUnban(user.id)} className={`${styles.actionBtn} ${styles.success}`} title="Unban" aria-label={`Unban ${user.displayName}`}><CheckCircle size={14} /></button>
                                                : <button onClick={() => handleBan(user.id)}   className={`${styles.actionBtn} ${styles.danger}`}  title="Ban"   aria-label={`Ban ${user.displayName}`}><Ban size={14} /></button>
                                            }
                                            {user.status === 'SUSPENDED' && <button onClick={() => handleUnsuspend(user.id)} className={`${styles.actionBtn} ${styles.success}`} title="Unsuspend" aria-label={`Unsuspend ${user.displayName}`}><Play size={14} /></button>}
                                            {user.status !== 'SUSPENDED' && user.status !== 'BANNED' && <button onClick={() => handleSuspend(user.id)} className={`${styles.actionBtn} ${styles.warn}`} title="Suspend" aria-label={`Suspend ${user.displayName}`}><Pause size={14} /></button>}
                                            <button onClick={() => handleDelete(user.id)} className={`${styles.actionBtn} ${styles.muted}`} title="Delete" aria-label={`Delete ${user.displayName}`}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pages > 1 && (
                    <nav className={styles.pagination} aria-label="User pagination">
                        <button
                            className={styles.pageBtn}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            aria-label="Previous page"
                        >←</button>
                        <span className={styles.pageInfo}>{page} / {pages}</span>
                        <button
                            className={styles.pageBtn}
                            onClick={() => setPage(p => Math.min(pages, p + 1))}
                            disabled={page === pages}
                            aria-label="Next page"
                        >→</button>
                    </nav>
                )}
            </main>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
                isWarn={confirmModal.isWarn}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <InputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                message={inputModal.message}
                inputType={inputModal.inputType}
                isDanger={inputModal.isDanger}
                onConfirm={inputModal.action}
                onCancel={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
