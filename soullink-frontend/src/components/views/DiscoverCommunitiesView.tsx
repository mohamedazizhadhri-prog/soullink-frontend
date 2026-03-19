"use client";

import React, { useState, useEffect } from 'react';
import { Search, Compass, Users, ArrowRight, Loader2, Globe } from 'lucide-react';
import styles from './DiscoverCommunitiesView.module.css';
import api from '@/lib/api';
import { JoinCommunityModal } from '../modals/JoinCommunityModal';

interface CommunityDiscovery {
    id: string;
    name: string;
    description: string | null;
    iconUrl: string | null;
    bannerUrl: string | null;
    _count: {
        members: number;
    };
}

export function DiscoverCommunitiesView() {
    const [communities, setCommunities] = useState<CommunityDiscovery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

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
                        {filtered.map(community => (
                            <div key={community.id} className={styles.card}>
                                <div className={styles.cardBanner}>
                                    {community.bannerUrl && <img src={community.bannerUrl} alt="" />}
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
                                    <Link
                                        href={`/server/${community.id}`}
                                        className={styles.viewBtn}
                                    >
                                        View Community <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        ))}
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

// Helper Link wrapper because we're in DiscoverCommunitiesView
function Link({ href, children, className }: { href: string, children: React.ReactNode, className?: string }) {
    return <a href={href} className={className}>{children}</a>;
}
