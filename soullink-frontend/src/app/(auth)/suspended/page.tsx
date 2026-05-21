"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, Scale, Loader2 } from "lucide-react";
import api from "@/lib/api";
import styles from "./page.module.css";
import { AppealModal } from "@/components/modals/AppealModal";

interface SuspensionDetails {
    reportId: string;
    action: string;
    reason: string;
    expiresAt: string | null;
    createdAt: string;
    hasAppealed: boolean;
}

export default function SuspendedPage() {
    const router = useRouter();
    const [details, setDetails] = useState<SuspensionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAppeal, setShowAppeal] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // Endpoint gives current active ban/suspension details
                const res = await api.get("/users/me/suspension");
                if (res.data.status === "success" && res.data.data) {
                    setDetails(res.data.data);
                } else {
                    // Not actually suspended? Go home.
                    router.push("/");
                }
            } catch (err: any) {
                if (err.response?.status === 404) {
                    router.push("/");
                }
            } finally {
                setLoading(false);
            }
        };

        const token = localStorage.getItem("sl_token");
        if (!token) {
            router.push("/login");
            return;
        }

        fetchStatus();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem("sl_token");
        localStorage.removeItem("sl_user");
        router.push("/login");
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <Loader2 size={48} className="animate-spin" color="#ff4757" />
            </div>
        );
    }

    if (!details) return null;

    const isPermaban = details.action === "BAN" || !details.expiresAt;

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.icon}>
                    <ShieldAlert size={40} />
                </div>
                
                <h1 className={styles.title}>Account {isPermaban ? "Banned" : "Suspended"}</h1>
                
                <p className={styles.message}>
                    Your account has been restricted due to a violation of the SoulLink Community Guidelines. 
                    You currently do not have access to the platform.
                </p>

                <div className={styles.detailsBox}>
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Reason for Action</span>
                        <span className={styles.detailValue}>{details.reason}</span>
                    </div>
                    
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Action Date</span>
                        <span className={styles.detailValue}>{new Date(details.createdAt).toLocaleDateString()}</span>
                    </div>

                    {!isPermaban && details.expiresAt && (
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Suspension Ends</span>
                            <span className={styles.detailValue} style={{ color: "#ffab00" }}>
                                {new Date(details.expiresAt).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={18} /> Logout
                    </button>
                    {!details.hasAppealed && (
                        <button className={styles.appealBtn} onClick={() => setShowAppeal(true)}>
                            <Scale size={20} /> Submit Appeal
                        </button>
                    )}
                    {details.hasAppealed && (
                        <button className={styles.appealBtn} disabled>
                            <Scale size={20} /> Appeal Pending
                        </button>
                    )}
                </div>
            </div>

            {showAppeal && (
                <AppealModal 
                    reportId={details.reportId} 
                    onClose={() => setShowAppeal(false)} 
                    onSuccess={() => {
                        setShowAppeal(false);
                        setDetails({ ...details, hasAppealed: true });
                    }}
                />
            )}
        </div>
    );
}
