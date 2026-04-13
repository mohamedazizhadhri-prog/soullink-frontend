"use client";

import React, { useState, useEffect } from 'react';
import { Search, Compass, Users, ArrowRight, Loader2, Globe, Lock } from 'lucide-react';
import styles from './DiscoverCommunitiesView.module.css';
import api from '@/lib/api';
import { JoinCommunityModal } from '../modals/JoinCommunityModal';
import { useRouter } from 'next/navigation';

interface CommunityDiscovery {
    id: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    bannerUrl: string | null;
    isPublic: boolean;
    _count: {
        members: number;
    };
}

export function DiscoverCommunitiesView() {
    const router = useRouter();
    const [communities, setCommunities] = useState<CommunityDiscovery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchDiscover = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/communities/discover');
                setCommunities(response.data.data.communities);
            } catch (err) {
                console.error('Failed to fetch discovery:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDiscover();
    }, []);

    const handleJoin = async (community: CommunityDiscovery) => {
        if (joiningId || joinedIds.has(community.id)) return;
        setJoiningId(community.id);
        try {
            await api.post(`/communities/${community.id}/join`);
            setJoinedIds(prev => new Set(prev).add(community.id));
            router.push(`/server/${community.id}`);
        } catch (err: any) {
            const msg = err.response?.data?.message || '';
            // If already a member, just navigate there
            if (msg.includes('already a member')) {
                router.push(`/server/${community.id}`);
            } else {
                console.error('Failed to join community:', err);
            }
        } finally {
            setJoiningId(null);
        }
    };

    const filtered = communities.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.banner}>
                    <Compass size={40} className={styles.titleIcon} />
                    <h1>Discover Communities</h1>
                    <p>Find your next group of soul connections in these public spaces.</p>
                </div>

                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Find a community..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className={styles.joinBtn} onClick={() => setIsJoinModalOpen(true)}>
                        Join with Code
                    </button>
                </div>
            </header>

            <div className={styles.results}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <Loader2 className={styles.spin} size={48} />
                        <span>Finding spaces for you...</span>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className={styles.grid}>
                        {filtered.map(community => {
                            const isJoining = joiningId === community.id;
                            const hasJoined = joinedIds.has(community.id);
                            return (
                                <div key={community.id} className={styles.card}>
                                    <div className={styles.cardBanner}>
                                        {community.bannerUrl && <img src={community.bannerUrl} alt="" />}
                                        {/* Privacy Badge */}
                                        <div style={{
                                            position: 'absolute', top: 8, right: 8,
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '3px 8px', borderRadius: 20,
                                            fontSize: '0.7rem', fontWeight: 600,
                                            background: community.isPublic ? 'rgba(76,175,80,0.85)' : 'rgba(255,71,87,0.85)',
                                            color: 'white', backdropFilter: 'blur(4px)'
                                        }}>
                                            {community.isPublic
                                                ? <><Globe size={10} /> Public</>
                                                : <><Lock size={10} /> Private</>
                                            }
                                        </div>
                                    </div>
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardInfo}>
                                            <div className={styles.cardIcon}>
                                                {community.iconUrl ? (
                                                    <img src={community.iconUrl} alt={community.name} />
                                                ) : (
                                                    <span>{community.name[0]}</span>
                                                )}
                                            </div>
                                            <div className={styles.cardTitle}>
                                                <h3>{community.name}</h3>
                                                <div className={styles.memberCount}>
                                                    <Users size={14} />
                                                    <span>{community._count.members} Members</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className={styles.cardDesc}>{community.description || "A community of soul seekers."}</p>
                                        <button
                                            className={styles.viewBtn}
                                            onClick={() => handleJoin(community)}
                                            disabled={isJoining || hasJoined}
                                            style={{ opacity: (isJoining || hasJoined) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                                        >
                                            {isJoining
                                                ? <><Loader2 size={15} className={styles.spin} /> Joining...</>
                                                : hasJoined
                                                    ? 'Joined!'
                                                    : <>Join Community <ArrowRight size={16} /></>
                                            }
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <Globe size={48} />
                        <h3>No communities found</h3>
                        <p>Try searching for something else or create your own!</p>
                    </div>
                )}
            </div>

            <JoinCommunityModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
        </div>
    );
}


