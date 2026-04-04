"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    User,
    Target,
    Brain,
    Bell,
    Shield,
    Palette,
    CreditCard,
    Loader2,
    ArrowLeft,
    LogOut,
    Table2,
    FileDown,
} from "lucide-react";
import { useAuth, API_URL } from "@/context/AuthContext";
import { useTheme } from "@/components/layout/Providers";
import { cn } from "@/lib/utils";

const SECTIONS = [
    { id: "profile", label: "Profile", icon: User, registeredOnly: true },
    { id: "productivity", label: "Productivity & goals", icon: Target, registeredOnly: false },
    { id: "ai", label: "AI insights", icon: Brain, registeredOnly: false },
    { id: "notifications", label: "Notifications", icon: Bell, registeredOnly: false },
    { id: "privacy", label: "Privacy & data", icon: Shield, registeredOnly: false },
    { id: "appearance", label: "Appearance", icon: Palette, registeredOnly: false },
    { id: "billing", label: "Subscription & billing", icon: CreditCard, registeredOnly: true },
];

function authHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={cn(
                "relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors",
                checked ? "border-primary bg-primary/25" : "border-ui bg-foreground/[0.04]",
                disabled && "opacity-50 pointer-events-none"
            )}
        >
            <span
                className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-foreground shadow transition-transform",
                    checked ? "left-6 bg-primary" : "left-1"
                )}
            />
        </button>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading, updateUser, logout } = useAuth();
    const { setTheme } = useTheme();

    const [active, setActive] = useState("productivity");
    const [loadSettings, setLoadSettings] = useState(true);
    const [saving, setSaving] = useState(false);
    const [banner, setBanner] = useState("");

    const [settings, setSettings] = useState(null);

    const [profileName, setProfileName] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profileAvatar, setProfileAvatar] = useState("");
    const [pwdCurrent, setPwdCurrent] = useState("");
    const [pwdNew, setPwdNew] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState("");

    const registered = user && !user.isAnonymous;

    const load = useCallback(async () => {
        if (!user) return;
        setLoadSettings(true);
        setBanner("");
        try {
            const res = await axios.get(`${API_URL}/settings`, { headers: authHeaders() });
            setSettings(res.data);
            if (!user.isAnonymous) {
                setProfileName(user.name || "");
                setProfileEmail(user.email || "");
                setProfileAvatar(user.avatar || "");
            }
        } catch (e) {
            setBanner(e.response?.data?.error || "Could not load settings.");
        } finally {
            setLoadSettings(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/auth/login?callbackUrl=/settings");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    const merged = useMemo(() => {
        if (!settings) return null;
        return settings;
    }, [settings]);

    useEffect(() => {
        if (!merged?.appearance?.theme) return;
        const t = merged.appearance.theme;
        if (t === "light" || t === "dark") setTheme(t);
    }, [merged?.appearance?.theme, setTheme]);

    async function patchSettings(partial) {
        setSaving(true);
        setBanner("");
        try {
            const res = await axios.patch(`${API_URL}/settings`, partial, { headers: authHeaders() });
            setSettings(res.data);
            if (partial.appearance?.theme === "light" || partial.appearance?.theme === "dark") {
                setTheme(partial.appearance.theme);
            }
            if (partial.appearance?.theme === "midnight") setTheme("dark");
            setBanner("Saved.");
        } catch (e) {
            setBanner(e.response?.data?.error || "Save failed.");
        } finally {
            setSaving(false);
        }
    }

    async function saveProfile(e) {
        e.preventDefault();
        if (!registered) return;
        setSaving(true);
        setBanner("");
        try {
            const res = await axios.patch(
                `${API_URL}/auth/profile`,
                { name: profileName, email: profileEmail, avatar: profileAvatar },
                { headers: authHeaders() }
            );
            updateUser({ name: res.data.name, email: res.data.email, avatar: res.data.avatar });
            setBanner("Profile updated.");
        } catch (e) {
            setBanner(e.response?.data?.error || "Update failed.");
        } finally {
            setSaving(false);
        }
    }

    async function savePassword(e) {
        e.preventDefault();
        if (!registered) return;
        setSaving(true);
        setBanner("");
        try {
            await axios.post(
                `${API_URL}/auth/password`,
                { currentPassword: pwdCurrent, newPassword: pwdNew },
                { headers: authHeaders() }
            );
            setPwdCurrent("");
            setPwdNew("");
            setBanner("Password updated.");
        } catch (e) {
            setBanner(e.response?.data?.error || "Password change failed.");
        } finally {
            setSaving(false);
        }
    }

    async function clearBrowsingData() {
        if (!window.confirm("Clear all tracked browsing data stored for your account? This cannot be undone.")) return;
        setSaving(true);
        try {
            await axios.delete(`${API_URL}/tracking`, { headers: authHeaders() });
            setBanner("Browsing data cleared.");
        } catch (e) {
            setBanner(e.response?.data?.error || "Could not clear data.");
        } finally {
            setSaving(false);
        }
    }

    async function downloadMyDataZip() {
        if (!registered) return;
        if (!user.isPremium && user.subscription !== "pro") {
            setBanner("Data export (CSV) is a Premium feature. Upgrade to unlock.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/auth/my-data/export?format=csv`, { headers: authHeaders() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || res.statusText || "Export failed.");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "prodlytics-my-data-csv.zip";
            a.click();
            URL.revokeObjectURL(url);
            setBanner("CSV (ZIP) download started.");
        } catch (e) {
            setBanner(e.message || "Export failed.");
        } finally {
            setSaving(false);
        }
    }

    async function downloadMyDataPdf() {
        if (!registered) return;
        if (!user.isPremium && user.subscription !== "pro") {
            setBanner("Data export (PDF) is a Premium feature. Upgrade to unlock.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/auth/my-data/export?format=pdf`, { headers: authHeaders() });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || res.statusText || "Export failed.");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "prodlytics-my-data-summary.pdf";
            a.click();
            URL.revokeObjectURL(url);
            setBanner("PDF summary download started.");
        } catch (e) {
            setBanner(e.message || "Export failed.");
        } finally {
            setSaving(false);
        }
    }

    async function deleteAccount() {
        if (!registered) return;
        if (!window.confirm("Permanently delete your account and associated data?")) return;
        setSaving(true);
        try {
            await axios.post(`${API_URL}/auth/delete-account`, { confirm: deleteConfirm }, { headers: authHeaders() });
            setDeleteConfirm("");
            await logout();
            router.replace("/");
        } catch (e) {
            setBanner(e.response?.data?.error || "Deletion failed.");
        } finally {
            setSaving(false);
        }
    }

    async function openBillingPortal() {
        if (!registered) return;
        setSaving(true);
        setBanner("");
        try {
            const res = await axios.post(`${API_URL}/billing/create-portal-session`, {}, { headers: authHeaders() });
            if (res.data?.url) window.location.href = res.data.url;
        } catch (e) {
            setBanner(e.response?.data?.error || "Could not open billing portal.");
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            </div>
        );
    }

    const navSections = SECTIONS.filter((s) => !s.registeredOnly || registered);

    return (
        <div className="min-h-screen bg-background">
            <div className="flex min-h-screen flex-col md:flex-row">
                {/* Side Navigation / Category Picker */}
                <aside className={cn(
                    "flex flex-col border-r-ui bg-background transition-all duration-300 md:w-80",
                    active ? "hidden md:flex" : "flex w-full"
                )}>
                    <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-ui-muted bg-background/80 p-5 backdrop-blur-xl md:p-8 md:bg-transparent md:border-none">
                        <button
                            onClick={() => router.push("/")}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-ui bg-foreground/[0.03] text-muted md:hidden"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">Settings</h1>

                        </div>
                    </div>

                    <nav className="flex-1 space-y-1.5 overflow-y-auto p-4 md:px-6 md:py-2">
                        {navSections.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActive(s.id)}
                                className={cn(
                                    "sidebar-nav-btn group w-full border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                                    active === s.id && "border-primary/35 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/[0.14]"
                                )}
                            >
                                <s.icon size={20} className={cn("transition-transform group-hover:scale-110", active === s.id && "text-primary")} />
                                <span className="font-bold">{s.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto border-t-ui-muted p-4 md:p-6">
                        <button
                            onClick={() => logout()}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-muted transition-all hover:bg-destructive/10 hover:text-destructive"
                        >
                            <LogOut size={18} />
                            <span>Sign out</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className={cn(
                    "relative min-w-0 flex-1 flex-col overflow-y-auto bg-foreground/[0.01]",
                    active ? "flex" : "hidden md:flex"
                )}>
                    {active && (
                        <div className="sticky top-0 z-30 flex items-center gap-4 bg-background/80 p-4 backdrop-blur-xl md:hidden">
                            <button
                                onClick={() => setActive(null)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="text-lg font-black tracking-tight">
                                {navSections.find(s => s.id === active)?.label}
                            </h2>
                        </div>
                    )}

                    <div className="mx-auto w-full max-w-4xl p-6 md:p-12 lg:p-16">
                        {banner && (
                            <div className="mb-8 rounded-2xl border-2 border-primary/20 bg-primary/5 px-6 py-4 text-sm font-bold text-primary shadow-xl shadow-primary/5">
                                {banner}
                            </div>
                        )}

                        {loadSettings || !merged ? (
                            <div className="flex h-64 items-center justify-center gap-3 text-muted">
                                <Loader2 className="animate-spin" size={24} />
                                <span className="font-bold uppercase tracking-widest text-xs">Syncing Preferences…</span>
                            </div>
                        ) : (
                            <div className="space-y-16 pb-20">
                                {active === "profile" && registered && (
                                    <section id="section-profile" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-primary pl-5">
                                            <h2 className="text-2xl font-black text-foreground">Account Profile</h2>
                                            <p className="text-xs font-semibold text-muted">Identify yourself within the ProdLytics ecosystem.</p>
                                        </div>
                                        <form onSubmit={saveProfile} className="glass-card space-y-6 rounded-[32px] border-2 border-ui p-8 shadow-2xl shadow-primary/5">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Full Identity</span>
                                                    <input
                                                        value={profileName}
                                                        onChange={(e) => setProfileName(e.target.value)}
                                                        className="w-full rounded-2xl border border-ui bg-background px-5 py-3 text-sm font-bold shadow-inner transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Digital Address</span>
                                                    <input
                                                        type="email"
                                                        value={profileEmail}
                                                        onChange={(e) => setProfileEmail(e.target.value)}
                                                        className="w-full rounded-2xl border border-ui bg-background px-5 py-3 text-sm font-bold shadow-inner transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Avatar Matrix Link</span>
                                                <input
                                                    value={profileAvatar}
                                                    onChange={(e) => setProfileAvatar(e.target.value)}
                                                    placeholder="https://images.prodltyics.io/user-avatar..."
                                                    className="w-full rounded-2xl border border-ui bg-background px-5 py-3 text-sm font-bold shadow-inner transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="w-full rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-[0.25em] text-white shadow-xl shadow-primary/30 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                                            >
                                                Commit Profile Changes
                                            </button>
                                        </form>

                                        {user.hasPassword ? (
                                            <form onSubmit={savePassword} className="glass-card space-y-6 rounded-[32px] border-2 border-ui p-8 mt-12">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-secondary" />
                                                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Security Protocol</h3>
                                                </div>
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Current Key</span>
                                                        <input
                                                            type="password"
                                                            value={pwdCurrent}
                                                            onChange={(e) => setPwdCurrent(e.target.value)}
                                                            className="w-full rounded-2xl border border-ui bg-background px-5 py-3 text-sm font-bold"
                                                            autoComplete="current-password"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">New Matrix Key</span>
                                                        <input
                                                            type="password"
                                                            value={pwdNew}
                                                            onChange={(e) => setPwdNew(e.target.value)}
                                                            className="w-full rounded-2xl border border-ui bg-background px-5 py-3 text-sm font-bold"
                                                            autoComplete="new-password"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={saving}
                                                    className="rounded-[18px] border-2 border-ui px-8 py-3 text-xs font-black uppercase tracking-widest transition-all hover:bg-foreground/5 disabled:opacity-50"
                                                >
                                                    Rotate Security Keys
                                                </button>
                                            </form>
                                        ) : (
                                            <div className="glass-card rounded-3xl border-2 border-ui p-6 text-sm font-bold text-muted bg-foreground/[0.02]">
                                                Google Protocol Detected. Access credentials managed via Google Cloud.
                                            </div>
                                        )}
                                    </section>
                                )}

                                {active === "productivity" && (
                                    <section id="section-productivity" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-primary pl-5">
                                            <h2 className="text-2xl font-black text-foreground">Optimization Goals</h2>
                                            <p className="text-xs font-semibold text-muted">Calibrate your focus and target output.</p>
                                        </div>
                                        <div className="glass-card space-y-8 rounded-[32px] border-2 border-ui p-8 shadow-2xl shadow-primary/5">
                                            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">System Focus Capacity (Hours/Day)</span>
                                                <div className="mt-4 flex items-center gap-6">
                                                    <input
                                                        type="range"
                                                        min={0.5}
                                                        max={16}
                                                        step={0.5}
                                                        value={merged.goals.dailyHours}
                                                        onChange={(e) => setSettings(prev => ({...prev, goals: {...prev.goals, dailyHours: Number(e.target.value)}}))}
                                                        className="h-2 flex-1 accent-primary"
                                                    />
                                                    <span className="text-2xl font-black text-primary">{merged.goals.dailyHours}h</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid gap-4">
                                                {[
                                                    ["enableGoalTracking", "Automated Goal Monitoring", "Track active targets against real-time browsing telemetry."],
                                                    ["enableStreaks", "Performance Continuity", "Maintain and visualize daily performance streaks."],
                                                    ["enableDeepWorkTracking", "Deep Work Pulse", "Bio-metric inspired tracking for uninterrupted focus blocks."]
                                                ].map(([key, title, desc]) => (
                                                    <div key={key} className="flex items-center justify-between gap-6 p-4 rounded-2xl border border-ui/50 bg-foreground/[0.02]">
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-black text-foreground">{title}</p>
                                                            <p className="text-[10px] font-medium text-muted leading-tight max-w-xs">{desc}</p>
                                                        </div>
                                                        <Toggle
                                                            checked={merged.goals[key]}
                                                            onChange={(v) => setSettings(prev => ({...prev, goals: {...prev.goals, [key]: v}}))}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => patchSettings({ goals: merged.goals })}
                                                className="w-full rounded-2xl bg-secondary py-4 text-xs font-black uppercase tracking-[0.25em] text-white shadow-xl shadow-secondary/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                                            >
                                                Apply Parameters
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {active === "ai" && (
                                    <section id="section-ai" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-primary pl-5">
                                            <h2 className="text-2xl font-black text-foreground">AI Intelligence</h2>
                                            <p className="text-xs font-semibold text-muted">Configure the neural engine for insights.</p>
                                        </div>
                                        <div className="glass-card space-y-8 rounded-[32px] border-2 border-ui p-8">
                                            <div className="grid gap-4">
                                                {[
                                                    ["enabled", "Neural Synthesis", "Master switch for AI processing."],
                                                    ["predictive", "Future State Projection", "Predict performance bottlenecks before they occur."],
                                                    ["suggestions", "Adaptive Coaching", "Real-time workflow adjustments based on focus states."],
                                                    ["cognitiveLoad", "Bio-Load Monitoring", "Analyze the mental cost of your current tasks."]
                                                ].map(([key, title, desc]) => (
                                                    <div key={key} className="flex items-center justify-between gap-6 p-4 rounded-2xl border border-ui/50 bg-foreground/[0.02]">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-black text-foreground">{title}</p>
                                                            <p className="text-[10px] font-medium text-muted leading-tight max-w-xs">{desc}</p>
                                                        </div>
                                                        <Toggle
                                                            checked={merged.aiSettings[key]}
                                                            onChange={(v) => setSettings(prev => ({...prev, aiSettings: {...prev.aiSettings, [key]: v}}))}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => patchSettings({ aiSettings: merged.aiSettings })}
                                                className="w-full rounded-[20px] bg-primary py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20"
                                            >
                                                Synchronize Neural Engine
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {active === "notifications" && (
                                    <section id="section-notifications" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-primary pl-5">
                                            <h2 className="text-2xl font-black text-foreground">System Alerts</h2>
                                            <p className="text-xs font-semibold text-muted">Customize how the platform communicates.</p>
                                        </div>
                                        <div className="glass-card space-y-6 rounded-[32px] border-2 border-ui p-8">
                                            <div className="grid gap-4">
                                                {[
                                                    ["browser", "OS Integration", "Push alerts via web browser notifications."],
                                                    ["distractionAlerts", "Anomaly Detection", "Get alerted when focus drops below safe thresholds."],
                                                    ["goalReminders", "Target Pulse", "Reminders for incomplete objectives."],
                                                    ["weeklyReports", "Synthesis Reports", "Detailed weekly summary of all telemetry data."]
                                                ].map(([key, title, desc]) => (
                                                    <div key={key} className="flex items-center justify-between gap-6 p-4 rounded-xl border border-ui/30">
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-black text-foreground">{title}</p>
                                                            <p className="text-[10px] font-medium text-muted">{desc}</p>
                                                        </div>
                                                        <Toggle
                                                            checked={merged.notifications[key]}
                                                            onChange={(v) => setSettings(prev => ({...prev, notifications: {...prev.notifications, [key]: v}}))}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => patchSettings({ notifications: merged.notifications })}
                                                className="w-full rounded-2xl bg-foreground text-background py-4 text-xs font-black uppercase tracking-widest hover:invert transition-all"
                                            >
                                                Update Alert Protocol
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {active === "privacy" && (
                                    <section id="section-privacy" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-primary pl-5">
                                            <h2 className="text-2xl font-black text-foreground">Privacy Shield</h2>
                                            <p className="text-xs font-semibold text-muted">Control your data footprint and tracking states.</p>
                                        </div>
                                        <div className="glass-card space-y-8 rounded-[32px] border-2 border-ui p-8 shadow-2xl shadow-primary/5">
                                            <div className="flex items-center justify-between p-5 rounded-2xl bg-foreground/[0.03] border-2 border-ui">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black text-foreground uppercase tracking-wider">Master Stealth Mode</p>
                                                    <p className="text-[10px] font-bold text-muted uppercase">Enable or disable all telemetry collection.</p>
                                                </div>
                                                <Toggle
                                                    checked={merged.privacy.trackingEnabled}
                                                    onChange={(v) => setSettings(prev => ({...prev, privacy: {...prev.privacy, trackingEnabled: v}}))}
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Scheduled Stealth (Until)</span>
                                                <input
                                                    type="datetime-local"
                                                    value={merged.privacy.pauseTrackingUntil ? new Date(merged.privacy.pauseTrackingUntil).toISOString().slice(0, 16) : ""}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setSettings(prev => ({...prev, privacy: {...prev.privacy, pauseTrackingUntil: v ? new Date(v).toISOString() : null}}));
                                                    }}
                                                    className="w-full rounded-2xl border border-ui bg-background px-5 py-3 text-sm font-bold shadow-inner"
                                                />
                                            </div>

                                            <div className="pt-8 border-t border-ui-muted space-y-6">
                                                <div className="flex flex-col gap-4 sm:flex-row">
                                                    <button
                                                        type="button"
                                                        onClick={clearBrowsingData}
                                                        className="flex-1 rounded-2xl border-2 border-destructive/30 bg-destructive/5 px-6 py-4 text-xs font-black uppercase tracking-widest text-destructive hover:bg-destructive hover:text-white transition-all shadow-lg shadow-destructive/5"
                                                    >
                                                        Purge Telemetry Data
                                                    </button>
                                                </div>

                                                {registered && (
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            onClick={downloadMyDataZip}
                                                            className={cn(
                                                                "group flex items-center justify-between rounded-2xl border-2 p-5 transition-all",
                                                                user.isPremium || user.subscription === "pro"
                                                                    ? "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
                                                                    : "border-ui-muted bg-foreground/[0.02] text-muted opacity-60"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <Table2 size={24} className="text-primary" />
                                                                <div className="text-left">
                                                                    <p className="text-xs font-black uppercase tracking-widest text-foreground">Export CSV</p>
                                                                    <p className="text-[10px] font-bold text-muted">Full Raw Logs</p>
                                                                </div>
                                                            </div>
                                                            {!(user.isPremium || user.subscription === "pro") && <Shield size={16} className="text-primary" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={downloadMyDataPdf}
                                                            className={cn(
                                                                "group flex items-center justify-between rounded-2xl border-2 p-5 transition-all",
                                                                user.isPremium || user.subscription === "pro"
                                                                    ? "border-secondary/40 bg-secondary/5 text-foreground hover:bg-secondary/10"
                                                                    : "border-ui-muted bg-foreground/[0.02] text-muted opacity-60"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <FileDown size={24} className="text-secondary" />
                                                                <div className="text-left">
                                                                    <p className="text-xs font-black uppercase tracking-widest text-foreground">Export PDF</p>
                                                                    <p className="text-[10px] font-bold text-muted">Analytic Summary</p>
                                                                </div>
                                                            </div>
                                                            {!(user.isPremium || user.subscription === "pro") && <Shield size={16} className="text-secondary" />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {active === "appearance" && (
                                    <section id="section-appearance" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-primary pl-5">
                                            <h2 className="text-2xl font-black text-foreground">Interface Aesthetics</h2>
                                            <p className="text-xs font-semibold text-muted">Customize the visual identity of your dashboard.</p>
                                        </div>
                                        <div className="glass-card space-y-8 rounded-[32px] border-2 border-ui p-8 shadow-2xl shadow-primary/5">
                                            <div className="grid gap-8 md:grid-cols-2">
                                                <div className="space-y-4">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Ambient Theme</span>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {["dark", "light"].map(t => (
                                                            <button
                                                                key={t}
                                                                onClick={() => {
                                                                    setSettings(prev => ({...prev, appearance: {...prev.appearance, theme: t}}));
                                                                    setTheme(t);
                                                                }}
                                                                className={cn(
                                                                    "rounded-2xl border-2 p-4 text-xs font-black uppercase tracking-widest transition-all",
                                                                    merged.appearance.theme === t ? "border-primary bg-primary/10 text-primary" : "border-ui bg-background text-muted"
                                                                )}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => {
                                                                setSettings(prev => ({...prev, appearance: {...prev.appearance, theme: 'midnight'}}));
                                                                setTheme('dark');
                                                            }}
                                                            className={cn(
                                                                "col-span-2 rounded-2xl border-2 p-4 text-xs font-black uppercase tracking-widest transition-all",
                                                                merged.appearance.theme === 'midnight' ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_rgba(109,40,217,0.2)]" : "border-ui bg-background text-muted"
                                                            )}
                                                        >
                                                            Midnight Black
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/80">Data Density</span>
                                                    <div className="grid gap-3">
                                                        {["normal", "compact"].map(d => (
                                                            <button
                                                                key={d}
                                                                onClick={() => setSettings(prev => ({...prev, appearance: {...prev.appearance, density: d}}))}
                                                                className={cn(
                                                                    "rounded-2xl border-2 p-4 text-xs font-black uppercase tracking-widest transition-all",
                                                                    merged.appearance.density === d ? "border-secondary bg-secondary/10 text-secondary" : "border-ui bg-background text-muted"
                                                                )}
                                                            >
                                                                {d} Mode
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => patchSettings({ appearance: merged.appearance })}
                                                className="w-full rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/30"
                                            >
                                                Commit Visual Settings
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {active === "billing" && registered && (
                                    <section id="section-billing" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                        <div className="space-y-1 border-l-4 border-amber-400 pl-5">
                                            <h2 className="text-2xl font-black text-foreground">Matrix Tier & Billing</h2>
                                            <p className="text-xs font-semibold text-muted">Manage your subscription and fiscal connection.</p>
                                        </div>
                                        <div className="glass-card space-y-8 rounded-[32px] border-2 border-ui p-8 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
                                            <div className="flex flex-wrap items-center justify-between gap-6 p-8 rounded-[28px] border-2 border-primary/20 bg-background shadow-2xl">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted/80">Current Operational Status</p>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest",
                                                            user.subscription === "pro" || user.isPremium ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-muted/20 text-muted"
                                                        )}>
                                                            {user.subscription === "pro" || user.isPremium ? "PRO ACTIVATED" : "FREE TIER"}
                                                        </span>
                                                        {(user.subscription === "pro" || user.isPremium) && <Crown className="text-amber-400" size={24} />}
                                                    </div>
                                                </div>
                                                <Link href="/upgrade" className="rounded-2xl bg-foreground text-background px-8 py-4 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                                                    Modify Tier
                                                </Link>
                                            </div>

                                            {((user.subscription === "pro" || user.isPremium) && user.stripeCustomerId) ? (
                                                <div className="p-8 rounded-[28px] border-2 border-ui bg-foreground/[0.02]">
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Stripe Connection</h4>
                                                    <p className="mt-2 text-xs font-medium text-muted leading-relaxed">Your subscription is linked to a Stripe customer ID. Exit the ProdLytics interface to manage billing in the secure Stripe portal.</p>
                                                    <button
                                                        type="button"
                                                        onClick={openBillingPortal}
                                                        className="mt-6 rounded-xl border-2 border-primary/40 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all"
                                                    >
                                                        Launch Portal
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-8 rounded-[28px] border-2 border-ui bg-foreground/[0.02] flex items-center gap-4">
                                                    <Shield size={24} className="text-muted/40" />
                                                    <p className="text-xs font-bold text-muted uppercase tracking-wider">No active Stripe session detected for this ID.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
