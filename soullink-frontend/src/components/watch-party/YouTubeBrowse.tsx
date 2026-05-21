"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './YouTubeBrowse.module.css';

interface VideoItem {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    viewCount?: string;
    duration?: string;
}

interface YouTubeBrowseProps {
    onSelect: (videoId: string, title: string, thumbnail: string) => void;
    variant?: 'sidebar' | 'wide';
}

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

function formatViews(n: string): string {
    const num = parseInt(n, 10);
    if (isNaN(num)) return '';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K views`;
    return `${num} views`;
}

function formatDuration(iso: string): string {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const h = match[1] ? `${match[1]}:` : '';
    const m = match[2] ?? '0';
    const s = (match[3] ?? '0').padStart(2, '0');
    return `${h}${h ? m.padStart(2, '0') : m}:${s}`;
}

const CATEGORIES = [
    { label: '🔥 Trending', regionCode: 'US' },
    { label: '🎵 Music', categoryId: '10' },
    { label: '🎮 Gaming', categoryId: '20' },
    { label: '😂 Comedy', categoryId: '23' },
    { label: '📰 News', categoryId: '25' },
    { label: '⚽ Sports', categoryId: '17' },
];

// Deterministic pseudo-random based on string seed
function seededRandom(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const sin = Math.sin(hash) * 10000;
    return sin - Math.floor(sin);
}

function generateBlobShape(seed: string): string {
    // More extreme range for irregular, liquid-like blobs
    const r = (offset: number) => 8 + Math.floor(seededRandom(seed + offset) * 84);
    return `${r(0)}% ${r(1)}% ${r(2)}% ${r(3)}% / ${r(4)}% ${r(5)}% ${r(6)}% ${r(7)}%`;
}

function generateBlobShapeAlt(seed: string): string {
    const r = (offset: number) => 5 + Math.floor(seededRandom(seed + offset) * 90);
    return `${r(10)}% ${r(11)}% ${r(12)}% ${r(13)}% / ${r(14)}% ${r(15)}% ${r(16)}% ${r(17)}%`;
}

// 3D tilt toward cursor
function handleCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -10;
    const ry = ((x - cx) / cx) * 10;
    e.currentTarget.style.setProperty('--tilt-rx', `${rx}deg`);
    e.currentTarget.style.setProperty('--tilt-ry', `${ry}deg`);
}

function handleCardMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty('--tilt-rx', '0deg');
    e.currentTarget.style.setProperty('--tilt-ry', '0deg');
}

export function YouTubeBrowse({ onSelect, variant = 'sidebar' }: YouTubeBrowseProps) {
    const [activeCategory, setActiveCategory] = useState(0);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [searchMode, setSearchMode] = useState(false);

    const fetchTrending = useCallback(async (categoryIdx: number) => {
        if (!API_KEY) return;
        setLoading(true);
        try {
            const cat = CATEGORIES[categoryIdx];
            const catParam = cat.categoryId ? `&videoCategoryId=${cat.categoryId}` : '';
            const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=20&regionCode=US${catParam}&key=${API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setVideos(data.items.map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                channelTitle: item.snippet.channelTitle,
                viewCount: item.statistics?.viewCount,
                duration: item.contentDetails?.duration,
            })));
        } catch (e) {
            console.error('YouTubeBrowse fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearch = useCallback(async () => {
        if (!query.trim() || !API_KEY) return;

        const urlMatch = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^&\s]+)/);
        if (urlMatch?.[1]) {
            onSelect(urlMatch[1], 'Video from URL', '');
            return;
        }

        setLoading(true);
        setSearchMode(true);
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query)}&key=${API_KEY}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            setVideos(data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium?.url,
                channelTitle: item.snippet.channelTitle,
            })));
        } catch (e) {
            console.error('YouTubeBrowse search error:', e);
        } finally {
            setLoading(false);
        }
    }, [query, onSelect]);

    useEffect(() => {
        if (!searchMode) fetchTrending(activeCategory);
    }, [activeCategory, searchMode, fetchTrending]);

    // Generate deterministic organic shapes for each video
    const organicShapes = useMemo(() => {
        return videos.map((v, i) => ({
            blob1: generateBlobShape(v.id + '_a'),
            blob2: generateBlobShapeAlt(v.id + '_b'),
            delay: `${(seededRandom(v.id + '_delay') * -20).toFixed(1)}s`,
            duration: `${15 + seededRandom(v.id + '_dur') * 10}s`,
            span: seededRandom(v.id + '_span') > 0.75 ? 'span2' : 'span1',
            glowDelay: `${(seededRandom(v.id + '_glow') * -4).toFixed(1)}s`,
        }));
    }, [videos]);

    const isWide = variant === 'wide';

    return (
        <div className={`${styles.browse} ${isWide ? styles.wide : ''}`}>
            {/* Search bar */}
            <div className={styles.searchBar}>
                <input
                    className={styles.searchInput}
                    placeholder="Search YouTube or paste URL…"
                    value={query}
                    onChange={e => { setQuery(e.target.value); if (!e.target.value) { setSearchMode(false); } }}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className={styles.searchBtn} onClick={handleSearch}>🔍</button>
            </div>

            {/* Category chips */}
            {!searchMode && (
                <div className={styles.categories}>
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={i}
                            className={`${styles.chip} ${activeCategory === i ? styles.chipActive : ''}`}
                            onClick={() => setActiveCategory(i)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}

            {searchMode && (
                <button className={styles.backBtn} onClick={() => { setSearchMode(false); setQuery(''); }}>
                    ← Back to Browse
                </button>
            )}

            {/* Video grid */}
            {isWide ? (
                /* ── Organic Biomorphic Grid (wide mode) ── */
                <div className={styles.organicGrid}>
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className={`${styles.organicSkeleton} ${styles[`skeletonDelay${i % 4}`]}`} />
                        ))
                    ) : (
                        videos.map((video, i) => {
                            const shape = organicShapes[i];
                            return (
                                <div
                                    key={video.id}
                                    className={`${styles.organicCard} ${shape?.span === 'span2' ? styles.span2 : ''}`}
                                    onClick={() => onSelect(video.id, video.title, video.thumbnail)}
                                    onMouseMove={handleCardMouseMove}
                                    onMouseLeave={handleCardMouseLeave}
                                    style={{
                                        '--blob-1': shape?.blob1,
                                        '--blob-2': shape?.blob2,
                                        '--anim-delay': shape?.delay,
                                        '--anim-duration': shape?.duration,
                                        '--glow-delay': shape?.glowDelay,
                                    } as React.CSSProperties}
                                >
                                    <div className={styles.organicThumbWrap}>
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className={styles.organicThumb}
                                            loading="lazy"
                                        />
                                        {video.duration && (
                                            <span className={styles.organicDuration}>{formatDuration(video.duration)}</span>
                                        )}
                                        <div className={styles.organicOverlay} />
                                    </div>
                                    <div className={styles.organicInfo}>
                                        <p className={styles.organicTitle}>{video.title}</p>
                                        <p className={styles.organicChannel}>{video.channelTitle}</p>
                                        {video.viewCount && (
                                            <p className={styles.organicViews}>{formatViews(video.viewCount)}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* ── Compact Sidebar Grid ── */
                <div className={styles.grid}>
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={styles.skeleton} />
                        ))
                    ) : (
                        videos.map(video => (
                            <div
                                key={video.id}
                                className={styles.card}
                                onClick={() => onSelect(video.id, video.title, video.thumbnail)}
                            >
                                <div className={styles.thumbWrap}>
                                    <img src={video.thumbnail} alt={video.title} className={styles.thumb} />
                                    {video.duration && (
                                        <span className={styles.duration}>{formatDuration(video.duration)}</span>
                                    )}
                                </div>
                                <div className={styles.cardInfo}>
                                    <p className={styles.cardTitle}>{video.title}</p>
                                    <p className={styles.channel}>{video.channelTitle}</p>
                                    {video.viewCount && (
                                        <p className={styles.views}>{formatViews(video.viewCount)}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
