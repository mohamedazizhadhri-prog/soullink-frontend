import React, { useState, useEffect, useMemo } from "react";
import { useNovaState } from "@/context/NovaContext";
import styles from "./ServerSidebar.module.css";
import { Home, Plus, Hash, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";
import { CreateCommunityModal } from "../modals/CreateCommunityModal";
import { useOnboardingOptional } from "@/context/OnboardingContext";
import { DEMO_COMMUNITIES, isDemoEntityId } from "@/lib/onboardingDemo";

interface Community {
    id: string;
    name: string;
    iconUrl: string | null;
}

export function ServerSidebar() {
    const { isNightMode } = useNovaState();
    const pathname = usePathname();
    const onboarding = useOnboardingOptional();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchCommunities = async () => {
        try {
            const response = await api.get('/communities');
            setCommunities(response.data.data.communities);
        } catch (err) {
            console.error('Failed to fetch communities:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCommunities();
    }, []);

    useEffect(() => {
        socketService.on('community:joined', fetchCommunities);
        return () => {
            socketService.off('community:joined', fetchCommunities);
        };
    }, []);

    const mergedCommunities = useMemo(() => {
        if (onboarding?.isTourActive && onboarding?.isDemoWorldVisible) {
            return [...DEMO_COMMUNITIES, ...communities];
        }
        return communities;
    }, [onboarding?.isTourActive, onboarding?.isDemoWorldVisible, communities]);

    return (
        <nav
            className={styles.sidebar}
            data-eatid="server-section"
            data-onboarding-anchor="server-rail"
        >


            {/* Dynamic Communities (+ tour wax museum) */}
            {mergedCommunities.map((community) => {
                const isActive = pathname.startsWith(`/server/${community.id}`);
                const isDemo = isDemoEntityId(community.id);
                const inner = (
                    <>
                        {community.iconUrl ? (
                            <img src={community.iconUrl} alt={community.name} className={styles.iconImage} />
                        ) : (
                            <div className={styles.iconPlaceholder}>{community.name[0]}</div>
                        )}
                        <div className={styles.pill} />
                    </>
                );
                if (isDemo) {
                    return (
                        <button
                            type="button"
                            key={community.id}
                            className={`${styles.serverIcon} ${isActive ? styles.active : ''}`}
                            title={`${community.name} (tour preview)`}
                            onClick={(e) => e.preventDefault()}
                        >
                            {inner}
                        </button>
                    );
                }
                return (
                    <Link
                        key={community.id}
                        href={`/server/${community.id}`}
                        className={`${styles.serverIcon} ${isActive ? styles.active : ''}`}
                        title={community.name}
                    >
                        {inner}
                    </Link>
                );
            })}

            {/* Discover Section */}
            <Link
                href="/communities/discover"
                className={`${styles.serverIcon} ${styles.discoverBtn} ${pathname === '/communities/discover' ? styles.active : ''}`}
                title="Discover Communities"
            >
                <Globe size={24} />
                <div className={styles.pill} />
            </Link>

            {/* Create Community */}
            <div
                className={`${styles.serverIcon} ${styles.createBtn}`}
                title="Create Community"
                onClick={() => setIsCreateModalOpen(true)}
            >
                <Plus size={24} />
            </div>


            <CreateCommunityModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {isNightMode && (
                <div className={styles.starField}>
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className={styles.celestialStar}
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 1.5 + 1}px`,
                                height: `${Math.random() * 1.5 + 1}px`,
                                '--duration': `${3 + Math.random() * 4}s`
                            } as any}
                        />
                    ))}
                </div>
            )}
        </nav>
    );
}
