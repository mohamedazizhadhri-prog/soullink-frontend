"use client";

import React, { useState } from 'react';
import styles from './VideoSearch.module.css';

interface VideoSearchResult {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}

interface VideoSearchProps {
    onSelect: (videoId: string, title: string, thumbnail: string) => void;
}

export function VideoSearch({ onSelect }: VideoSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<VideoSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
            setError("YouTube API Key is missing. Please paste a direct YouTube URL.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Check if it's a direct URL
            const urlMatch = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
            if (urlMatch && urlMatch[1]) {
                const videoId = urlMatch[1].split('&')[0];
                console.log("Direct URL detected, videoId:", videoId);
                onSelect(videoId, "Video from URL", "");
                return;
            }

            console.log("Fetching search results for:", query);
            const res = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
            );
            const data = await res.json();

            if (data.error) {
                console.error("YT API Error:", data.error);
                throw new Error(data.error.message);
            }

            const formattedResults = data.items.map((item: any) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
            }));
            console.log("Search results received:", formattedResults.length);

            setResults(formattedResults);
        } catch (err: any) {
            setError(err.message || "Failed to search videos");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSearch} className={styles.searchBar}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search YouTube or paste URL..."
                    className={styles.input}
                />
                <button type="submit" className={styles.searchBtn} disabled={loading}>
                    {loading ? '...' : '🔍'}
                </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.resultsGrid}>
                {results.length === 0 && !loading && !error && (
                    <div className={styles.emptyState}>
                        <p>🔍 Search for a video or paste a YouTube URL above to get started!</p>
                    </div>
                )}
                {results.map((video) => (
                    <div 
                        key={video.id} 
                        className={styles.videoCard}
                        onClick={() => onSelect(video.id, video.title, video.thumbnail)}
                    >
                        <img src={video.thumbnail} alt={video.title} className={styles.thumbnail} />
                        <div className={styles.info}>
                            <p className={styles.title}>{video.title}</p>
                            <p className={styles.channel}>{video.channelTitle}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
