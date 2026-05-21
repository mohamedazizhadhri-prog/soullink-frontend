/**
 * Admin Dashboard Route Group — layout.tsx
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6
 * 
 * Standalone layout (NO Shell wrapper) — admin has its own chrome.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SoulLink Admin | God Mode',
    description: 'SoulLink Administrative Control Panel',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: '#0A0A12',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}>
            {children}
        </div>
    );
}
