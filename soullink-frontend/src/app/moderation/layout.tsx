/**
 * Moderation Route Group — layout.tsx
 * Reference: SoulLink — Admin, Moderator & Analytics Walkthrough Plan §6
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'SoulLink Moderation | Mod Panel',
    description: 'SoulLink Moderator Control Panel',
};

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
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
