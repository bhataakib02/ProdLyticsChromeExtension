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
        <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between gap-3 border-b-ui-muted bg-background/60 px-4 backdrop-blur-md transition-all sm:h-20 sm:px-8">
            <div className="relative flex-1 group max-w-[48px] overflow-hidden transition-all duration-300 focus-within:max-w-xl sm:max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                    type="search"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setActivitySearchQuery("");
                    }}
                    placeholder="Search…"
                    autoComplete="off"
                    aria-label="Search activity"
                    className="w-full rounded-2xl border border-ui bg-foreground/[0.03] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/60 transition-all focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none"
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
                                className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-primary via-primary-dark to-secondary/80 p-5 shadow-2xl shadow-primary/20 backdrop-blur-xl"
                            >
                                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                                        <UserCircle size={24} className="text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black tracking-tight text-white">{user.name}</p>
                                        <p className="truncate text-[10px] font-medium text-white/70">
                                            {user.email || "Private session"}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowProfile(false);
                                            logout();
                                        }}
                                        className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-[0.98]"
                                    >
                                        <LogOut size={14} />
                                        <span>{user.isAnonymous ? "Initialize New Session" : "Sign Out Account"}</span>
                                    </button>
                                </div>

                                {user.subscription !== "pro" && !user.isPremium && (
                                    <div className="mt-4 rounded-xl bg-black/20 p-3 text-center">
                                        <p className="text-[10px] font-bold text-white/90">Upgrade to Pro for full insights</p>
                                    </div>
                                )}
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
