"use client";

import { useAuth } from "@/context/AuthContext";
import { Bell, Search, UserCircle, RefreshCw, LogOut, Settings, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
    const { user, logout } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const notificationRef = useRef(null);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const syncWithExtension = () => {
        setSyncing(true);
        const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";
        console.log(`📡 Syncing to extension from Navbar: ${extensionId}`);
        if (typeof window !== "undefined" && window.chrome && window.chrome.runtime) {
            window.chrome.runtime.sendMessage(extensionId, { action: "syncAll" }, (response) => {
                if (window.chrome.runtime.lastError) {
                    console.warn("❌ Could not sync:", window.chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Sync successful");
                }
                setTimeout(() => setSyncing(false), 1000);
            });
        } else {
            // Simulate for UI feel if extension not detected
            setTimeout(() => setSyncing(false), 1000);
        }
    };

    if (!user) return null;

    return (
        <header className="h-20 border-b border-foreground/5 bg-background/60 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50 w-full transition-all">
            <div className="relative w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search activity..."
                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:bg-foreground/[0.08] transition-all"
                />
            </div>

            <div className="flex items-center gap-4">
                {/* Sync Extension Button - Global */}
                <button
                    onClick={syncWithExtension}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${syncing
                            ? 'bg-primary/20 border-primary/30 text-primary cursor-wait'
                            : 'bg-foreground/5 border-foreground/10 hover:bg-foreground/10 hover:border-foreground/20 text-foreground active:scale-95'
                        }`}
                >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync Extension'}
                </button>

                <div className="h-8 w-[1px] bg-foreground/10 mx-1" />

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2.5 rounded-xl transition-all relative border ${showNotifications
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'bg-foreground/5 border-foreground/10 hover:bg-foreground/10 text-muted hover:text-foreground'
                            }`}
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full border border-background shadow-lg" />
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-3 w-80 glass-card p-4 shadow-2xl border border-foreground/10 z-50"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-sm">Notifications</h3>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">2 NEW</span>
                                </div>
                                <div className="space-y-3">
                                    <NotificationItem
                                        title="Daily Goal Achieved"
                                        time="2 mins ago"
                                        description="You've completed your 2h Deep Work session."
                                        type="success"
                                    />
                                    <NotificationItem
                                        title="Extension Synced"
                                        time="1 hour ago"
                                        description="Your blocklist was updated successfully."
                                        type="info"
                                    />
                                </div>
                                <button className="w-full mt-4 py-2 text-[10px] font-bold text-muted hover:text-foreground transition-colors uppercase tracking-widest border-t border-foreground/5 pt-4">
                                    View All Notifications
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className={`flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-2xl transition-all border group ${showProfile
                                ? 'bg-primary/10 border-primary/20'
                                : 'bg-foreground/5 border-foreground/10 hover:border-foreground/20 hover:bg-foreground/10'
                            }`}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold leading-none mb-1">{user.name}</p>
                            <p className="text-[9px] text-muted uppercase tracking-widest font-black">Pro Member</p>
                        </div>
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-xl border border-foreground/20 object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                                <UserCircle size={24} />
                            </div>
                        )}
                    </button>

                    <AnimatePresence>
                        {showProfile && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-3 w-56 glass-card overflow-hidden shadow-2xl border border-foreground/10 z-50 p-1.5"
                            >
                                <div className="p-3 mb-1 bg-foreground/[0.03] rounded-xl border border-foreground/5">
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Signed in as</p>
                                    <p className="text-xs font-bold truncate">{user.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <DropdownLink href="/settings" icon={<Settings size={14} />} label="Settings" />
                                    <DropdownLink href="/profile" icon={<UserCircle size={14} />} label="My Profile" />
                                    <DropdownLink href="/extension-help" icon={<ExternalLink size={14} />} label="Extension Setup" />
                                    <div className="h-[1px] bg-foreground/5 my-1 mx-2" />
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/10 rounded-lg transition-all"
                                    >
                                        <LogOut size={14} />
                                        <span>Log out</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}

function NotificationItem({ title, time, description, type }) {
    return (
        <div className="p-3 rounded-xl bg-foreground/[0.03] border border-foreground/5 hover:border-primary/20 transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold group-hover:text-primary transition-colors">{title}</span>
                <span className="text-[9px] text-muted">{time}</span>
            </div>
            <p className="text-[10px] text-muted leading-relaxed line-clamp-2">{description}</p>
        </div>
    );
}

function DropdownLink({ href, icon, label }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all"
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}
