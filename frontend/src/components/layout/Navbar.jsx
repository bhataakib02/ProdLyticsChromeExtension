"use client";

import { useAuth } from "@/context/AuthContext";
import { Search, UserCircle, RefreshCw, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { requestExtensionSync } from "@/lib/extensionSync";
import { useDashboard } from "@/context/DashboardContext";

export default function Navbar() {
    const { user, logout } = useAuth();
    const { activitySearchQuery, setActivitySearchQuery } = useDashboard();
    const [syncing, setSyncing] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const syncWithExtension = async () => {
        setSyncing(true);
        requestExtensionSync();
        setTimeout(() => setSyncing(false), 1000);
    };

    if (!user) return null;

    return (
        <header className="sticky top-0 z-50 flex min-h-20 w-full flex-wrap items-center justify-between gap-3 border-b-ui-muted bg-background/60 px-4 py-3 backdrop-blur-md transition-all sm:h-20 sm:flex-nowrap sm:px-8 sm:py-0">
            <div className="relative w-full max-w-xl flex-1 group sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                    type="search"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setActivitySearchQuery("");
                    }}
                    placeholder="Search sites, goals, blocklist…"
                    autoComplete="off"
                    aria-label="Search activity and sites"
                    className="w-full rounded-xl border-2 border-ui bg-foreground/5 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted transition-all focus:border-primary/50 focus:bg-foreground/[0.08] focus:outline-none"
                />
            </div>

            <div className="flex w-full items-center justify-end gap-3 sm:w-auto sm:justify-start sm:gap-4">
                <button
                    type="button"
                    onClick={syncWithExtension}
                    className={`btn-secondary-sm ${syncing ? "cursor-wait border-primary/35 bg-primary/15 text-primary" : ""}`}
                >
                    <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync Extension"}</span>
                    <span className="sm:hidden">{syncing ? "Syncing" : "Sync"}</span>
                </button>

                <div className="mx-1 hidden h-8 w-px bg-foreground/10 sm:block" />

                <div className="relative" ref={profileRef}>
                    <button
                        type="button"
                        onClick={() => setShowProfile((v) => !v)}
                        className={`btn-icon btn-icon-sm ${showProfile ? "border-primary/30 bg-primary/10 text-primary" : ""}`}
                        aria-expanded={showProfile}
                        aria-label="Account menu"
                    >
                        <UserCircle size={20} />
                    </button>
                    <AnimatePresence>
                        {showProfile && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="glass-card absolute right-0 z-50 mt-3 w-56 p-3 shadow-2xl"
                            >
                                <p className="truncate px-1 text-sm font-medium text-foreground">{user.name}</p>
                                <p className="mb-2 truncate px-1 text-[10px] text-muted">
                                    {user.email || "Private session — this browser only"}
                                </p>
                                <DropdownAction
                                    icon={<LogOut size={14} />}
                                    label={user.isAnonymous ? "New session" : "Sign out"}
                                    onClick={() => {
                                        setShowProfile(false);
                                        logout();
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}

function DropdownAction({ icon, label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-all hover:bg-foreground/5 hover:text-foreground"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
