"use client";

import React from "react";
import styles from "./ServerSidebar.module.css";
import { Home, Plus, Hash } from "lucide-react";
import Link from "next/link";
import { SERVERS_DATA } from "@/constants/servers";
import * as Icons from "lucide-react";

export function ServerSidebar() {
    return (
        <nav className={styles.sidebar} data-eatid="server-section">
            {/* Home Button */}
            <Link href="/" className={`${styles.serverIcon} ${styles.tomeIcon} ${styles.active}`} title="Home" data-singularity-target="server">
                <Home size={24} />
                <div className={styles.pill} />
            </Link>

            <div className={styles.separator} />

            {/* Dynamic Servers */}
            {SERVERS_DATA.map(server => {
                const IconComponent = (Icons as any)[server.icon] || Hash;
                return (
                    <Link
                        key={server.id}
                        href={`/server/${server.id}`}
                        className={styles.serverIcon}
                        data-singularity-target="server"
                        title={server.name}
                    >
                        <IconComponent size={24} />
                        <div className={styles.pill} />
                    </Link>
                );
            })}

            {/* Create Server */}
            <div className={`${styles.serverIcon} ${styles.createBtn}`} title="Create Server">
                <Plus size={24} />
            </div>
        </nav>
    );
}
