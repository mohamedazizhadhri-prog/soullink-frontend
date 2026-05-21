'use client';

/**
 * Admin User Detail Page — /admin/users/[id]
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §3.2
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { adminApi } from '@/lib/adminApi';
import { ConfirmationModal, InputModal } from '@/components/admin/AdminModal';
import styles from './user-detail.module.css';

const STATUS_COLOR: Record<string, string> = {
    ACTIVE: '#32CD32', BANNED: '#FF4444', SUSPENDED: '#FFD700',
    DELETED: '#808080', PENDING_VERIFICATION: '#A0A0B5',
};

export default function UserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [user,    setUser]    = useState<any>(null);
    const [logins,  setLogins]  = useState<any[]>([]);
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);
    const [saving,  setSaving]  = useState(false);

    // Modal States
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', isDanger: false, isWarn: false, action: () => {} });
    const [inputModal, setInputModal]     = useState({ isOpen: false, title: '', message: '', isDanger: false, inputType: 'text' as 'text'|'textarea'|'date', action: (val: string) => {} });


    useEffect(() => {
        adminApi.getUserDetail(id)
            .then((u: any) => {
                setUser(u);
                setLogins(u.loginHistory ?? []);
                setActions(u.modActions   ?? []);
            })
            .catch((e: any) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleBan = () => {
        setInputModal({
            isOpen: true,
            title: 'Ban User',
            message: 'Enter the reason for banning this user:',
            isDanger: true,
            inputType: 'textarea',
            action: async (reason: string) => {
                setInputModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.banUser(id, reason); const u = await adminApi.getUserDetail(id); setUser(u); setActions(u.modActions ?? []); }
                catch (e: any) { alert('Error: ' + e.message); }
                finally { setSaving(false); }
            }
        });
    };

    const handleUnban = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Unban User',
            message: 'Are you sure you want to lift the ban on this user?',
            isDanger: false,
            isWarn: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.unbanUser(id, 'Admin unban'); const u = await adminApi.getUserDetail(id); setUser(u); setActions(u.modActions ?? []); }
                catch (e: any) { alert('Error: ' + e.message); }
                finally { setSaving(false); }
            }
        });
    };

    const handleSuspend = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Suspend User',
            message: 'Are you sure you want to suspend this user? They will not be able to interact with the platform.',
            isWarn: true,
            isDanger: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.updateUser(id, { status: 'SUSPENDED' }); const u = await adminApi.getUserDetail(id); setUser(u); }
                catch (e: any) { alert('Error: ' + e.message); }
                finally { setSaving(false); }
            }
        });
    };

    const handleUnsuspend = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Suspension',
            message: 'Are you sure you want to reactivate this user?',
            isWarn: false,
            isDanger: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.updateUser(id, { status: 'ACTIVE' }); const u = await adminApi.getUserDetail(id); setUser(u); }
                catch (e: any) { alert('Error: ' + e.message); }
                finally { setSaving(false); }
            }
        });
    };

    const handleRoleChange = (role: string) => {
        setConfirmModal({
            isOpen: true,
            title: `Change Role to ${role}`,
            message: `Are you sure you want to change this user's role to ${role}?`,
            isWarn: role === 'MODERATOR',
            isDanger: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.updateUser(id, { role }); const u = await adminApi.getUserDetail(id); setUser(u); }
                catch (e: any) { alert('Error: ' + e.message); }
                finally { setSaving(false); }
            }
        });
    };

    const handleClearFace = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear Face Descriptor',
            message: 'Are you sure you want to clear this user\'s face descriptor? They will need to re-enroll next time they use a face-protected feature.',
            isWarn: true,
            isDanger: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.clearFaceDescriptor(id); }
                catch (e: any) { alert('Error: ' + e.message); }
                finally { setSaving(false); }
            }
        });
    };

    const handleDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete User Account',
            message: 'Are you sure you want to soft-delete this user? This will hide their profile and disable access.',
            isDanger: true,
            isWarn: false,
            action: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setSaving(true);
                try { await adminApi.deleteUser(id, false); router.push('/admin/users'); }
                catch (e: any) { alert('Error: ' + e.message); setSaving(false); }
            }
        });
    };

    if (loading) return <div className={styles.shell}><AdminSidebar /><main className={styles.main}><div className={styles.loading}>Loading user…</div></main></div>;
    if (error)   return <div className={styles.shell}><AdminSidebar /><main className={styles.main}><div className={styles.errorBanner}>⚠️ {error}</div></main></div>;
    if (!user)   return null;

    const bigFive = user.personalityProfile;
    const statusColor = STATUS_COLOR[user.status] ?? '#A0A0B5';

    return (
        <div className={styles.shell}>
            <AdminSidebar />
            <main className={styles.main}>

                {/* Back */}
                <Link href="/admin/users" className={styles.backLink}>← All Users</Link>

                {/* Header Card */}
                <div className={styles.profileCard}>
                    <div className={styles.avatarWrap}>
                        {user.avatarUrl
                            ? <img src={user.avatarUrl} alt={user.displayName} className={styles.avatar} />
                            : <div className={styles.avatarFallback}>{(user.displayName || '?')[0].toUpperCase()}</div>
                        }
                    </div>
                    <div className={styles.profileInfo}>
                        <h1 className={styles.displayName}>{user.displayName}</h1>
                        <p className={styles.handle}>@{user.handle}</p>
                        <div className={styles.chips}>
                            <span className={styles.chip} style={{ color: statusColor, borderColor: statusColor + '44' }}>{user.status}</span>
                            <span className={styles.chip} style={{ color: '#7B68EE', borderColor: '#7B68EE44' }}>{user.role}</span>
                            {user.emailVerified && <span className={styles.chip} style={{ color: '#32CD32', borderColor: '#32CD3244' }}>✓ Email</span>}
                            {user.phoneVerified && <span className={styles.chip} style={{ color: '#32CD32', borderColor: '#32CD3244' }}>✓ Phone</span>}
                            {user.faceVerified  && <span className={styles.chip} style={{ color: '#32CD32', borderColor: '#32CD3244' }}>✓ Face</span>}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actionGroup}>
                        {user.status === 'BANNED'
                            ? <button onClick={handleUnban} disabled={saving} className={styles.successBtn} id="unban-user-btn">✓ Unban</button>
                            : <button onClick={handleBan}   disabled={saving} className={styles.dangerBtn}  id="ban-user-btn">🔨 Ban</button>
                        }
                        {user.status === 'SUSPENDED'
                            ? <button onClick={handleUnsuspend} disabled={saving} className={styles.successBtn}>✓ Remove Suspension</button>
                            : user.status !== 'BANNED' && <button onClick={handleSuspend} disabled={saving} className={styles.warnBtn}>⏸ Suspend</button>
                        }
                        {user.role === 'USER'
                            ? <button onClick={() => handleRoleChange('MODERATOR')} disabled={saving} className={styles.primaryBtn} id="promote-user-btn">↑ Promote to Mod</button>
                            : user.role === 'MODERATOR'
                            ? <button onClick={() => handleRoleChange('USER')}      disabled={saving} className={styles.warnBtn}    id="demote-user-btn">↓ Demote to User</button>
                            : null
                        }
                        <button onClick={handleClearFace} disabled={saving} className={styles.warnBtn}   id="clear-face-btn">🔄 Clear Face</button>
                        <button onClick={handleDelete}    disabled={saving} className={styles.mutedBtn}  id="delete-user-btn">🗑 Delete</button>
                    </div>
                </div>

                <div className={styles.grid}>
                    {/* Info */}
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}>Profile Info</h2>
                        <dl className={styles.infoList}>
                            <dt>Email</dt>      <dd>{user.email ?? '—'}</dd>
                            <dt>Phone</dt>      <dd>{user.phone ?? '—'}</dd>
                            <dt>Location</dt>   <dd>{[user.city, user.country].filter(Boolean).join(', ') || '—'}</dd>
                            <dt>Timezone</dt>   <dd>{user.timezone ?? '—'}</dd>
                            <dt>Joined</dt>     <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
                            <dt>Last Login</dt> <dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</dd>
                        </dl>
                    </section>

                    {/* Big Five Personality */}
                    {bigFive && (
                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Personality Profile</h2>
                            {[
                                ['Openness',          bigFive.openness],
                                ['Conscientiousness', bigFive.conscientiousness],
                                ['Extraversion',      bigFive.extraversion],
                                ['Agreeableness',     bigFive.agreeableness],
                                ['Neuroticism',       bigFive.neuroticism],
                            ].map(([label, val]) => (
                                <div key={label as string} className={styles.traitRow}>
                                    <span className={styles.traitLabel}>{label}</span>
                                    <div className={styles.traitTrack}>
                                        <div className={styles.traitFill} style={{ width: `${(val as number) * 100}%` }} />
                                    </div>
                                    <span className={styles.traitVal}>{((val as number) * 100).toFixed(0)}</span>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Nova Memory */}
                    {user.novaMemory && (
                        <section className={styles.card}>
                            <h2 className={styles.cardTitle}>Nova Memory</h2>
                            <dl className={styles.infoList}>
                                <dt>Trust Level</dt>    <dd>{user.novaMemory.trustLevel}/10</dd>
                                <dt>Stage</dt>          <dd>{user.novaMemory.friendshipStage}</dd>
                                <dt>Current Mood</dt>   <dd>{user.novaMemory.currentMood ?? '—'}</dd>
                                <dt>Top Interests</dt>  <dd>{user.novaMemory.topInterests?.join(', ') || '—'}</dd>
                            </dl>
                        </section>
                    )}
                </div>

                {/* Login History */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Login History</h2>
                    {logins.length === 0 ? <p className={styles.empty}>No login records</p> : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead><tr><th>IP</th><th>Device</th><th>Status</th><th>Date</th></tr></thead>
                                <tbody>
                                    {logins.slice(0, 20).map((l: any) => (
                                        <tr key={l.id}>
                                            <td>{l.ipAddress}</td>
                                            <td className={styles.truncate}>{l.userAgent}</td>
                                            <td><span style={{ color: l.success ? '#32CD32' : '#FF4444' }}>{l.success ? '✓' : '✗'}</span></td>
                                            <td>{new Date(l.createdAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Mod Action History */}
                <section className={styles.card}>
                    <h2 className={styles.cardTitle}>Moderation History</h2>
                    {actions.length === 0 ? <p className={styles.empty}>No moderation actions</p> : (
                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead><tr><th>Action</th><th>Reason</th><th>By</th><th>Date</th></tr></thead>
                                <tbody>
                                    {actions.map((a: any) => (
                                        <tr key={a.id}>
                                            <td><span className={styles.actionChip}>{a.action}</span></td>
                                            <td>{a.reason}</td>
                                            <td>{a.moderator?.displayName ?? '—'}</td>
                                            <td>{new Date(a.createdAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

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
