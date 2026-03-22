"use client";

import { useState, useEffect } from "react";
import {
    User,
    Bell,
    Shield,
    Palette,
    Cloud,
    Trash2,
    Save,
    Loader2,
    Timer
} from "lucide-react";
import { useAuth, API_URL } from "@/context/AuthContext";
import { motion } from "framer-motion";
import axios from "axios";
import { useTheme } from "@/components/layout/Providers";

export default function SettingsPage() {
    const { user, checkUser, logout } = useAuth();
    const { theme, setTheme: setGlobalTheme } = useTheme();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [notifications, setNotifications] = useState({ focus: true, daily: true });
    const [weeklyGoalHours, setWeeklyGoalHours] = useState(40);
    const [deepWorkMinutes, setDeepWorkMinutes] = useState(25);
    const [breakMinutes, setBreakMinutes] = useState(5);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setGlobalTheme(user.preferences?.theme || "dark");
            setWeeklyGoalHours(user.preferences?.weeklyGoalHours || 40);
            setDeepWorkMinutes(user.preferences?.deepWorkMinutes || 25);
            setBreakMinutes(user.preferences?.breakMinutes || 5);

            // Handle transition from boolean to object if necessary
            const userNotifs = user.preferences?.notifications;
            if (typeof userNotifs === "object" && userNotifs !== null) {
                setNotifications({
                    focus: userNotifs.focus ?? true,
                    daily: userNotifs.daily ?? true
                });
            } else if (typeof userNotifs === "boolean") {
                setNotifications({ focus: userNotifs, daily: userNotifs });
            }
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("accessToken");
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Update Profile (Name/Email)
            await axios.put(`${API_URL}/auth/profile`, { name, email });

            // 2. Update Preferences (Theme/Notifications/Goals/Pomodoro)
            await axios.put(`${API_URL}/auth/preferences`, {
                theme,
                notifications,
                weeklyGoalHours,
                deepWorkMinutes,
                breakMinutes
            });

            await checkUser(); // Refresh user data in context
            alert("Settings saved successfully!");
        } catch (err) {
            console.error("Error saving settings:", err);
            alert(err.response?.data?.error || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (confirm("Are you SURE you want to delete your account? This will permanently delete ALL your tracking data and cannot be undone.")) {
            setDeleting(true);
            try {
                const token = localStorage.getItem("accessToken");
                await axios.delete(`${API_URL}/auth/account`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert("Account deleted.");
                logout();
            } catch (err) {
                console.error("Error deleting account:", err);
                alert("Failed to delete account.");
                setDeleting(false);
            }
        }
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-4xl font-bold  tracking-tight">Settings</h1>
                <p className="text-muted mt-2  text-sm">Manage your account, synchronization, and platform preferences.</p>
            </header>

            <div className="flex flex-col gap-6">
                {/* Account Section */}
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-foreground/5 flex items-center gap-3 bg-foreground/[0.02]">
                        <User className="text-primary" size={20} />
                        <h2 className="font-bold  uppercase tracking-wider text-sm">Account Profile</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Full Name</label>
                                <input
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all  text-sm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Email Address</label>
                                <input
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all  text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Weekly Goal (Hours)</label>
                                <input
                                    type="number"
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all  text-sm"
                                    value={weeklyGoalHours}
                                    onChange={(e) => setWeeklyGoalHours(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-foreground/5 flex items-center gap-3 bg-foreground/[0.02]">
                        <Bell className="text-accent" size={20} />
                        <h2 className="font-bold  uppercase tracking-wider text-sm">Notifications</h2>
                    </div>
                    <div className="p-8 space-y-8">
                        <SettingToggle
                            label="Focus Session Alerts"
                            description="Notify when focus session ends"
                            checked={notifications.focus}
                            onChange={(val) => setNotifications({ ...notifications, focus: val })}
                        />
                        <SettingToggle
                            label="Daily Reports"
                            description="Email a summary of productivity"
                            checked={notifications.daily}
                            onChange={(val) => setNotifications({ ...notifications, daily: val })}
                        />
                    </div>
                </div>

                {/* Deep Work Settings */}
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-foreground/5 flex items-center gap-3 bg-foreground/[0.02]">
                        <Timer className="text-primary" size={20} />
                        <h2 className="font-bold  uppercase tracking-wider text-sm">Deep Work Cycles</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Deep Work (Minutes)</label>
                                <input
                                    type="number"
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all  text-sm"
                                    value={deepWorkMinutes}
                                    onChange={(e) => setDeepWorkMinutes(parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Break Time (Minutes)</label>
                                <input
                                    type="number"
                                    className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all  text-sm"
                                    value={breakMinutes}
                                    onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="p-8 bg-accent/5 border border-accent/10 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-accent/30 transition-all duration-500">
                    <div className="text-center md:text-left">
                        <h3 className="font-bold text-accent  text-lg">Delete Account</h3>
                        <p className="text-[10px] text-muted  uppercase tracking-widest mt-1">Permanently remove all your tracking data</p>
                    </div>
                    <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-8 py-3 rounded-2xl font-bold hover:bg-accent hover:text-background transition-all active:scale-95 disabled:opacity-50 text-sm "
                    >
                        {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                        Delete Account
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-4 pb-12 pt-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 rounded-2xl font-bold bg-foreground/5 hover:bg-foreground/10 transition-all  text-sm active:scale-95"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-10 py-3 rounded-2xl font-bold bg-primary text-background flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all  text-sm disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Save Changes
                </button>
            </div>
        </div>
    );
}

function SettingToggle({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between group">
            <div>
                <p className="text-sm font-bold  group-hover:text-primary transition-colors">{label}</p>
                <p className="text-[11px] text-muted ">{description}</p>
            </div>
            <label className="switch">
                <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="slider round"></span>
            </label>
        </div>
    );
}


