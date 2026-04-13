import { redirect } from "next/navigation";

export default function ServerPage() {
    // If we land on /server without an ID, redirect to home or show placeholder
    // In SoulLink, we usually expect a server ID.
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.5)' }}>
            Select a server to begin connecting.
        </div>
    );
}
