"use client";

import { useAuth } from "@/context/AuthContext";
import { Bell, Search, UserCircle, RefreshCw, LogOut } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationService } from "@/services/notification.service";
import { requestExtensionSync } from "@/lib/extensionSync";

export default function Navbar() {
    const { user, logout } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const [showProfile, setShowProfile] = useState(false);

    const notificationRef = useRef(null);
    const profileRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, []);

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
        window.setTimeout(() => {
            void fetchNotifications();
        }, 0);

        // Polling optionally to keep fresh without sockets
        const interval = setInterval(fetchNotifications, 60000);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            clearInterval(interval);
        };
    }, [fetchNotifications]);

    const syncWithExtension = async () => {
        setSyncing(true);
        requestExtensionSync();
        try {
            await notificationService.createNotification({
                title: "Extension Synced",
                description: "Your blocklist was updated successfully.",
                type: "info"
            });
            await fetchNotifications();
        } catch (e) {
            console.error(e);
        }
        setTimeout(() => setSyncing(false), 1000);
    };

    if (!user) return null;

    return (
        <header className="sticky top-0 z-50 flex h-20 w-full items-center justify-between border-b-ui-muted bg-background/60 px-8 backdrop-blur-md transition-all">
            <div className="relative w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search activity..."
                    className="w-full rounded-xl border-2 border-ui bg-foreground/5 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted transition-all focus:border-primary/50 focus:bg-foreground/[0.08] focus:outline-none"
                />
            </div>

            <div className="flex items-center gap-4">
                {/* Sync Extension Button - Global */}
                <button
                    type="button"
                    onClick={syncWithExtension}
                    className={`btn-secondary-sm ${syncing ? "cursor-wait border-primary/35 bg-primary/15 text-primary" : ""}`}
                >
                    <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync Extension'}
                </button>

                <div className="h-8 w-[1px] bg-foreground/10 mx-1" />

                {/* Notifications */}
                <div className="relative" ref={notificationRef}>
                    <button
                        type="button"
                        onClick={async () => {
                            const opening = !showNotifications;
                            setShowNotifications(opening);
                            if (opening && unreadCount > 0) {
                                await notificationService.markAllAsRead();
                                fetchNotifications();
                            }
                        }}
                        className={`btn-icon btn-icon-sm relative ${showNotifications ? "border-primary/30 bg-primary/10 text-primary" : ""}`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-secondary rounded-full border border-background shadow-lg" />}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="glass-card absolute right-0 z-50 mt-3 w-80 p-4 shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-sm">Notifications</h3>
                                    {unreadCount > 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{unreadCount} NEW</span>}
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                    {notifications.length === 0 ? (
                                        <div className="text-center text-xs text-muted py-6">No notifications yet.</div>
                                    ) : (
                                        notifications.map(n => (
                                            <NotificationItem
                                                key={n._id}
                                                title={n.title}
                                                time={timeAgo(n.createdAt)}
                                                description={n.description}
                                                type={n.type}
                                                isRead={n.isRead}
                                            />
                                        ))
                                    )}
                                </div>
                                <button className="mt-4 w-full border-t-ui-muted pt-4 text-[10px] font-bold uppercase tracking-widest text-muted transition-colors hover:text-foreground">
                                    View All Notifications
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

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

function NotificationItem({ title, time, description, type, isRead }) {
    return (
        <div
            className={`group cursor-pointer rounded-xl border-2 p-3 transition-all ${!isRead ? "border-primary/30 bg-primary/5" : "border-ui-muted bg-foreground/[0.03] hover:border-primary/30"}`}
        >
            <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold transition-colors ${!isRead ? 'text-primary' : 'group-hover:text-primary'}`}>{title}</span>
                <span className="text-[9px] text-muted">{time}</span>
            </div>
            <p className="text-[10px] text-muted leading-relaxed line-clamp-2">{description}</p>
        </div>
    );
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}

function DropdownAction({ icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 rounded-lg transition-all"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
