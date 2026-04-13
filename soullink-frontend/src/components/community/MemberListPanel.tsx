"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./MemberListPanel.module.css";
import { Shield, Crown, Sword, UserX, ChevronRight, Pencil, Clock, Ban } from "lucide-react";
import api from "@/lib/api";

interface MemberUser {
    id: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    onlineStatus: string;
}

interface Member {
    id: string;
    role: string;
    nickname: string | null;
    joinedAt: string;
    user: MemberUser;
}

interface MemberListPanelProps {
    serverId: string;
    currentUserRole?: string;
    onProfileClick?: (handle: string) => void;
}

const ROLE_ORDER = ["OWNER", "ADMIN", "MODERATOR", "MEMBER"];
const ROLE_LABELS: Record<string, string> = {
    OWNER: "👑 Owner",
    ADMIN: "🛡️ Admins",
    MODERATOR: "⚔️ Moderators",
    MEMBER: "👤 Members",
};

const ROLE_HIERARCHY: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    MODERATOR: 2,
    MEMBER: 1,
};

export function MemberListPanel({ serverId, currentUserRole, onProfileClick }: MemberListPanelProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [bans, setBans] = useState<any[]>([]);
    const [view, setView] = useState<"members" | "bans">("members");
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; member: Member } | null>(null);
    const [roleSubmenu, setRoleSubmenu] = useState(false);
    const [showTimeoutModal, setShowTimeoutModal] = useState<Member | null>(null);
    const [showBanModal, setShowBanModal] = useState<Member | null>(null);
    const [showNicknameModal, setShowNicknameModal] = useState<Member | null>(null);
    
    // Form states
    const [reason, setReason] = useState("");
    const [duration, setDuration] = useState("60"); // minutes
    const [nickname, setNickname] = useState("");

    const fetchMembers = async () => {
        if (!serverId) return;
        try {
            const res = await api.get(`/communities/${serverId}/members`);
            setMembers(res.data.data.members || []);
        } catch (err) {
            console.error("Failed to fetch members:", err);
        }
    };

    const fetchBans = async () => {
        try {
            const res = await api.get(`/communities/${serverId}/bans`);
            setBans(res.data.data.bans);
        } catch (err) {
            console.error("Failed to fetch bans:", err);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [serverId]);

    useEffect(() => {
        if (view === "bans") fetchBans();
    }, [view, serverId]);

    useEffect(() => {
        const handleClick = () => {
            setContextMenu(null);
            setRoleSubmenu(false);
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, member: Member) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, member });
        setRoleSubmenu(false);
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            await api.patch(`/communities/${serverId}/members/${memberId}/role`, { role: newRole });
            setMembers(prev =>
                prev.map(m => m.id === memberId ? { ...m, role: newRole } : m)
            );
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update role");
        }
        setContextMenu(null);
    };

    const handleKick = async (memberId: string) => {
        if (!confirm("Are you sure you want to kick this member?")) return;
        try {
            await api.delete(`/communities/${serverId}/members/${memberId}`);
            setMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to kick member");
        }
        setContextMenu(null);
    };

    const handleTimeout = async () => {
        if (!showTimeoutModal) return;
        try {
            await api.post(`/communities/${serverId}/members/${showTimeoutModal.id}/timeout`, {
                reason,
                durationMinutes: duration
            });
            setShowTimeoutModal(null);
            setReason("");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to timeout member");
        }
    };

    const handleBan = async () => {
        if (!showBanModal) return;
        try {
            await api.post(`/communities/${serverId}/members/${showBanModal.id}/ban`, { reason });
            setMembers(prev => prev.filter(m => m.id !== showBanModal.id));
            setShowBanModal(null);
            setReason("");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to ban member");
        }
    };

    const handleUnban = async (userId: string) => {
        try {
            await api.delete(`/communities/${serverId}/members/${userId}/ban`);
            setBans(prev => prev.filter(b => b.userId !== userId));
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to unban user");
        }
    };

    const handleSetNickname = async () => {
        if (!showNicknameModal) return;
        try {
            await api.patch(`/communities/${serverId}/members/${showNicknameModal.id}/nickname`, { nickname });
            setMembers(prev => prev.map(m => m.id === showNicknameModal.id ? { ...m, nickname } : m));
            setShowNicknameModal(null);
            setNickname("");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to set nickname");
        }
    };

    const grouped = ROLE_ORDER.map(role => ({
        role,
        label: ROLE_LABELS[role],
        members: members.filter(m => m.role === role),
    })).filter(g => g.members.length > 0);

    const actorLevel = ROLE_HIERARCHY[(currentUserRole || "MEMBER").toUpperCase()] || 1;
    const canManageRoles = actorLevel >= ROLE_HIERARCHY["ADMIN"];
    const canKick = actorLevel >= ROLE_HIERARCHY["MODERATOR"];
    const canBan = actorLevel >= ROLE_HIERARCHY["MODERATOR"];
    const canTimeout = actorLevel >= ROLE_HIERARCHY["MODERATOR"];
    const canSetNickname = actorLevel >= ROLE_HIERARCHY["ADMIN"];

    return (
        <div className={styles.panel}>
            <div className={styles.tabHeader}>
                <button 
                    className={`${styles.tabBtn} ${view === 'members' ? styles.tabActive : ''}`}
                    onClick={() => setView('members')}
                >
                    Members
                </button>
                {canBan && (
                    <button 
                        className={`${styles.tabBtn} ${view === 'bans' ? styles.tabActive : ''}`}
                        onClick={() => setView('bans')}
                    >
                        Bans
                    </button>
                )}
            </div>

            {view === 'members' ? (
                <>
                    {grouped.map(group => (
                        <div key={group.role} className={styles.roleGroup}>
                            <div className={styles.roleHeader}>
                                {group.label}
                                <span className={styles.roleCount}>— {group.members.length}</span>
                            </div>
                            {group.members.map(member => (
                                <div
                                    key={member.id}
                                    className={styles.memberItem}
                                    onContextMenu={(e) => handleContextMenu(e, member)}
                                    onClick={() => member.user?.handle && onProfileClick?.(member.user.handle)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.avatarWrapper}>
                                        {member.user?.avatarUrl ? (
                                            <img src={member.user.avatarUrl} alt="" className={styles.avatar} />
                                        ) : (
                                            <div className={styles.avatarFallback}>
                                                {member.user?.displayName?.[0] || '?'}
                                            </div>
                                        )}
                                        <div
                                            className={styles.statusDot}
                                            data-status={member.user?.onlineStatus}
                                        />
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <div className={styles.memberName}>
                                            {member.nickname || member.user?.displayName || "Unknown"}
                                        </div>
                                        <div className={styles.memberHandle}>
                                            {member.nickname && <span className={styles.realName}>{member.user?.displayName} </span>}
                                            @{member.user?.handle}
                                        </div>
                                    </div>
                                    {member.role !== "MEMBER" && (
                                        <span className={styles.roleBadge} data-role={member.role}>
                                            {member.role}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    {members.length === 0 && <div className={styles.empty}>No members found</div>}
                </>
            ) : (
                <div className={styles.banList}>
                    {bans.map(ban => (
                        <div key={ban.id} className={styles.banItem}>
                            <img src={ban.user?.avatarUrl || ''} className={styles.miniAvatar} alt="" />
                            <div className={styles.banInfo}>
                                <div className={styles.banName}>{ban.user?.displayName}</div>
                                <div className={styles.banReason}>{ban.reason}</div>
                            </div>
                            <button className={styles.unbanBtn} onClick={() => ban.user?.id && handleUnban(ban.user.id)}>
                                Unban
                            </button>
                        </div>
                    ))}
                    {bans.length === 0 && <div className={styles.empty}>No banned users</div>}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className={styles.contextMenu}
                    style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 220) }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        className={styles.contextOption} 
                        onClick={() => { 
                            if (contextMenu?.member?.user?.handle) onProfileClick?.(contextMenu.member.user.handle); 
                            setContextMenu(null); 
                        }}
                    >
                        👤 View Profile
                    </button>
                    
                    <div className={styles.contextDivider} />

                    {canManageRoles && ROLE_HIERARCHY[contextMenu.member.role.toUpperCase()] < actorLevel && (
                        <div 
                            className={styles.contextOptionWrapper}
                            onMouseEnter={() => setRoleSubmenu(true)}
                            onMouseLeave={() => setRoleSubmenu(false)}
                        >
                            <button className={styles.contextOption}>
                                <Shield size={16} /> Change Role <ChevronRight size={14} style={{ marginLeft: "auto" }} />
                            </button>
                            {roleSubmenu && (
                                <div className={styles.roleSubmenuFlyout}>
                                    {["ADMIN", "MODERATOR", "MEMBER"]
                                        .filter(r => ROLE_HIERARCHY[r] < actorLevel)
                                        .map(role => (
                                            <button 
                                                key={role} 
                                                className={`${styles.roleOption} ${contextMenu.member.role.toUpperCase() === role ? styles.active : ''}`} 
                                                onClick={() => handleRoleChange(contextMenu.member.id, role)}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {canSetNickname && ROLE_HIERARCHY[contextMenu.member.role.toUpperCase()] < actorLevel && (
                        <button className={styles.contextOption} onClick={() => { setShowNicknameModal(contextMenu.member); setNickname(contextMenu.member.nickname || ""); setContextMenu(null); }}>
                            <Pencil size={16} /> Set Nickname
                        </button>
                    )}

                    <div className={styles.contextDivider} />

                    {canTimeout && ROLE_HIERARCHY[contextMenu.member.role] < actorLevel && (
                        <button className={styles.contextOption} onClick={() => { setShowTimeoutModal(contextMenu.member); setContextMenu(null); }}>
                            <Clock size={16} /> Timeout
                        </button>
                    )}

                    {canKick && ROLE_HIERARCHY[contextMenu.member.role] < actorLevel && (
                        <button className={styles.contextOption} onClick={() => handleKick(contextMenu.member.id)}>
                            <UserX size={16} /> Kick Member
                        </button>
                    )}

                    {canBan && ROLE_HIERARCHY[contextMenu.member.role] < actorLevel && (
                        <button className={`${styles.contextOption} ${styles.danger}`} onClick={() => { setShowBanModal(contextMenu.member); setContextMenu(null); }}>
                            <Ban size={16} /> Ban Member
                        </button>
                    )}
                </div>
            )}

            {/* Modals (Simplified for brevity, usually should be separate components) */}
            {showTimeoutModal && (
                <div className={styles.modalOverlay} onClick={() => setShowTimeoutModal(null)}>
                    <div className={styles.modModal} onClick={e => e.stopPropagation()}>
                        <h3>Timeout {showTimeoutModal.user.displayName}</h3>
                        <label>Duration</label>
                        <select value={duration} onChange={e => setDuration(e.target.value)}>
                            <option value="10">10 Minutes</option>
                            <option value="60">1 Hour</option>
                            <option value="1440">24 Hours</option>
                            <option value="10080">1 Week</option>
                        </select>
                        <label>Reason</label>
                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason..." />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowTimeoutModal(null)}>Cancel</button>
                            <button className={styles.confirmBtn} onClick={handleTimeout}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {showBanModal && (
                <div className={styles.modalOverlay} onClick={() => setShowBanModal(null)}>
                    <div className={styles.modModal} onClick={e => e.stopPropagation()}>
                        <h3>Ban {showBanModal.user.displayName}</h3>
                        <label>Reason</label>
                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason..." />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowBanModal(null)}>Cancel</button>
                            <button className={styles.confirmBtnDanger} onClick={handleBan}>Ban Member</button>
                        </div>
                    </div>
                </div>
            )}

            {showNicknameModal && (
                <div className={styles.modalOverlay} onClick={() => setShowNicknameModal(null)}>
                    <div className={styles.modModal} onClick={e => e.stopPropagation()}>
                        <h3>Set Nickname for {showNicknameModal.user.displayName}</h3>
                        <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="New nickname..." />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowNicknameModal(null)}>Cancel</button>
                            <button className={styles.confirmBtn} onClick={handleSetNickname}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
