"use client";

import React, { useState, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import styles from './GifPicker.module.css';

interface GifPickerProps {
    onSelect: (url: string) => void;
    onClose: () => void;
}

const GIPHY_API_KEY = "hw2xhvRKz30YKLkvzEx4wdEeF2fAXaLo"; // Legacy public beta key

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTrending();
    }, []);

    const fetchTrending = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setGifs(data.data || []);
        } catch (error) {
            console.error("Failed to fetch trending GIFs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!search.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`https://api.giphy.com/v1/gifs/search?q=${search}&api_key=${GIPHY_API_KEY}&limit=20`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setGifs(data.data || []);
        } catch (error) {
            console.error("Failed to search GIFs:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Trending GIFs</h3>
                <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
            </div>

            <form onSubmit={handleSearch} className={styles.searchBar}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search GIPHY..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </form>

            <div className={styles.grid}>
                {loading ? (
                    <div className={styles.loader}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    gifs.map((gif: any) => (
                        <div
                            key={gif.id}
                            className={styles.gifItem}
                            onClick={() => onSelect(gif.images.original.url)}
                        >
                            <img src={gif.images.fixed_height.url} alt={gif.title} />
                        </div>
                    ))
                )}
                {!loading && gifs.length === 0 && (
                    <p style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '20px', opacity: 0.5 }}>No GIFs found.</p>
                )}
            </div>
        </div>
    );
}
