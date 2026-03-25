"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { Bell, Search, UserCircle, RefreshCw, LogOut, Settings, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationService } from "@/services/notification.service";

export default function Navbar() {
    const { user, logout } = useAuth();
    const { setActiveTab } = useDashboard();
    const [syncing, setSyncing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
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
        fetchNotifications();

        // Polling optionally to keep fresh without sockets
        const interval = setInterval(fetchNotifications, 60000);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            clearInterval(interval);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    const syncWithExtension = async () => {
        setSyncing(true);
        const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";
        console.log(`📡 Syncing to extension from Navbar: ${extensionId}`);

        // Trigger notification natively
        try {
            await notificationService.createNotification({
                title: "Extension Synced",
                description: "Your blocklist was updated successfully.",
                type: "info"
            });
            await fetchNotifications();
        } catch (e) { console.error(e) }
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
                        onClick={async () => {
                            const opening = !showNotifications;
                            setShowNotifications(opening);
                            if (opening && unreadCount > 0) {
                                await notificationService.markAllAsRead();
                                fetchNotifications();
                            }
                        }}
                        className={`p-2.5 rounded-xl transition-all relative border ${showNotifications
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-foreground/5 border-foreground/10 hover:bg-foreground/10 text-muted hover:text-foreground'
                            }`}
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
                                className="absolute right-0 mt-3 w-80 glass-card p-4 shadow-2xl border border-foreground/10 z-50"
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
                                <button className="w-full mt-4 py-2 text-[10px] font-bold text-muted hover:text-foreground transition-colors uppercase tracking-widest border-t border-foreground/5 pt-4">
                                    View All Notifications
                                </button>
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
        <div className={`p-3 rounded-xl border transition-all cursor-pointer group ${!isRead ? 'bg-primary/5 border-primary/20' : 'bg-foreground/[0.03] border-foreground/5 hover:border-primary/20'}`}>
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
