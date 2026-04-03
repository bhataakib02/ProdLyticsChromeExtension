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
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:px-8 lg:gap-12">
                <aside className="w-full shrink-0 md:max-w-[220px] lg:max-w-[240px]">
                    <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground"
                    >
                        <ArrowLeft size={16} />
                        Dashboard
                    </button>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
                    <p className="mt-1 text-xs font-medium text-muted">Control ProdLytics for your workflow.</p>
                    <nav className="mt-8 space-y-1">
                        {navSections.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                    setActive(s.id);
                                    document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                                    active === s.id
                                        ? "bg-primary/15 text-primary"
                                        : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
                                )}
                            >
                                <s.icon size={18} className="shrink-0 opacity-90" />
                                {s.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="min-w-0 flex-1 space-y-10 pb-16">
                    {user.isAnonymous ? (
                        <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-foreground">
                            You&apos;re using an anonymous session.{" "}
                            <Link href="/auth/register" className="font-bold text-primary underline">
                                Create an account
                            </Link>{" "}
                            for profile, billing, and full data export.
                        </div>
                    ) : null}

                    {banner ? (
                        <div className="rounded-2xl border border-ui bg-foreground/[0.03] px-4 py-3 text-sm font-medium text-foreground">
                            {banner}
                        </div>
                    ) : null}

                    {loadSettings || !merged ? (
                        <div className="flex items-center gap-2 text-muted">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading preferences…
                        </div>
                    ) : (
                        <>
                            {registered ? (
                                <section id="section-profile" className="scroll-mt-8 space-y-6">
                                    <h2 className="text-lg font-black text-foreground">Profile</h2>
                                    <form onSubmit={saveProfile} className="glass-card space-y-4 rounded-3xl border-2 border-ui p-6">
                                        <label className="block">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Name</span>
                                            <input
                                                value={profileName}
                                                onChange={(e) => setProfileName(e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-medium"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Email</span>
                                            <input
                                                type="email"
                                                value={profileEmail}
                                                onChange={(e) => setProfileEmail(e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-medium"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                Profile picture URL
                                            </span>
                                            <input
                                                value={profileAvatar}
                                                onChange={(e) => setProfileAvatar(e.target.value)}
                                                placeholder="https://…"
                                                className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-medium"
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                                        >
                                            Save profile
                                        </button>
                                    </form>

                                    {user.hasPassword ? (
                                        <form onSubmit={savePassword} className="glass-card space-y-4 rounded-3xl border-2 border-ui p-6">
                                            <h3 className="text-sm font-black text-foreground">Change password</h3>
                                            <p className="text-xs text-muted">
                                                For accounts that sign in with email and password.
                                            </p>
                                            <label className="block">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                    Current password
                                                </span>
                                                <input
                                                    type="password"
                                                    value={pwdCurrent}
                                                    onChange={(e) => setPwdCurrent(e.target.value)}
                                                    className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm"
                                                    autoComplete="current-password"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                    New password
                                                </span>
                                                <input
                                                    type="password"
                                                    value={pwdNew}
                                                    onChange={(e) => setPwdNew(e.target.value)}
                                                    className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm"
                                                    autoComplete="new-password"
                                                />
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                                className="rounded-2xl border-2 border-ui px-5 py-2.5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                                            >
                                                Update password
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="glass-card rounded-3xl border-2 border-ui p-6 text-sm text-muted">
                                            Password change isn&apos;t shown for Google-only accounts. Manage security in your Google
                                            account.
                                        </div>
                                    )}
                                </section>
                            ) : null}

                            <section id="section-productivity" className="scroll-mt-8 space-y-4">
                                <h2 className="text-lg font-black text-foreground">Productivity & goals</h2>
                                <div className="glass-card space-y-6 rounded-3xl border-2 border-ui p-6">
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            Daily productivity goal (hours)
                                        </span>
                                        <input
                                            type="number"
                                            min={0.5}
                                            max={16}
                                            step={0.5}
                                            value={merged.goals.dailyHours}
                                            onChange={(e) =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    goals: { ...prev.goals, dailyHours: Number(e.target.value) },
                                                }))
                                            }
                                            className="mt-1 w-full max-w-xs rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-bold"
                                        />
                                    </label>
                                    {[
                                        ["enableGoalTracking", "Track goals against browsing"],
                                        ["enableStreaks", "Streak tracking"],
                                        ["enableDeepWorkTracking", "Deep work tracking"],
                                    ].map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-medium text-foreground/90">{label}</span>
                                            <Toggle
                                                checked={merged.goals[key]}
                                                onChange={(v) =>
                                                    setSettings((prev) => ({
                                                        ...prev,
                                                        goals: { ...prev.goals, [key]: v },
                                                    }))
                                                }
                                            />
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => patchSettings({ goals: merged.goals })}
                                        className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                                    >
                                        Save productivity settings
                                    </button>
                                </div>
                            </section>

                            <section id="section-ai" className="scroll-mt-8 space-y-4">
                                <h2 className="text-lg font-black text-foreground">AI insights</h2>
                                <div className="glass-card space-y-6 rounded-3xl border-2 border-ui p-6">
                                    {[
                                        ["enabled", "AI insights"],
                                        ["predictive", "Predictive analytics"],
                                        ["suggestions", "Personalized suggestions"],
                                        ["cognitiveLoad", "Cognitive load analysis"],
                                    ].map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-medium text-foreground/90">{label}</span>
                                            <Toggle
                                                checked={merged.aiSettings[key]}
                                                onChange={(v) =>
                                                    setSettings((prev) => ({
                                                        ...prev,
                                                        aiSettings: { ...prev.aiSettings, [key]: v },
                                                    }))
                                                }
                                            />
                                        </div>
                                    ))}
                                    <label className="block max-w-xs">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            Insight frequency
                                        </span>
                                        <select
                                            value={merged.aiSettings.frequency}
                                            onChange={(e) =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    aiSettings: { ...prev.aiSettings, frequency: e.target.value },
                                                }))
                                            }
                                            className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-medium"
                                        >
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => patchSettings({ aiSettings: merged.aiSettings })}
                                        className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                                    >
                                        Save AI settings
                                    </button>
                                </div>
                            </section>

                            <section id="section-notifications" className="scroll-mt-8 space-y-4">
                                <h2 className="text-lg font-black text-foreground">Notifications</h2>
                                <div className="glass-card space-y-6 rounded-3xl border-2 border-ui p-6">
                                    {[
                                        ["browser", "Browser notifications"],
                                        ["distractionAlerts", "Distraction alerts"],
                                        ["goalReminders", "Goal reminders"],
                                        ["weeklyReports", "Weekly report"],
                                    ].map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-medium text-foreground/90">{label}</span>
                                            <Toggle
                                                checked={merged.notifications[key]}
                                                onChange={(v) =>
                                                    setSettings((prev) => ({
                                                        ...prev,
                                                        notifications: { ...prev.notifications, [key]: v },
                                                    }))
                                                }
                                            />
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => patchSettings({ notifications: merged.notifications })}
                                        className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                                    >
                                        Save notifications
                                    </button>
                                </div>
                            </section>

                            <section id="section-privacy" className="scroll-mt-8 space-y-4">
                                <h2 className="text-lg font-black text-foreground">Privacy & data</h2>
                                <div className="glass-card space-y-6 rounded-3xl border-2 border-ui p-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm font-medium text-foreground/90">Tracking enabled</span>
                                        <Toggle
                                            checked={merged.privacy.trackingEnabled}
                                            onChange={(v) =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    privacy: { ...prev.privacy, trackingEnabled: v },
                                                }))
                                            }
                                        />
                                    </div>
                                    <label className="block max-w-md">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            Pause tracking until (optional)
                                        </span>
                                        <input
                                            type="datetime-local"
                                            value={
                                                merged.privacy.pauseTrackingUntil
                                                    ? new Date(merged.privacy.pauseTrackingUntil).toISOString().slice(0, 16)
                                                    : ""
                                            }
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    privacy: {
                                                        ...prev.privacy,
                                                        pauseTrackingUntil: v ? new Date(v).toISOString() : null,
                                                    },
                                                }));
                                            }}
                                            className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => patchSettings({ privacy: merged.privacy })}
                                        className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                                    >
                                        Save privacy preferences
                                    </button>
                                    <div className="border-t border-ui pt-6 space-y-3">
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={clearBrowsingData}
                                            className="rounded-2xl border-2 border-ui px-5 py-2.5 text-xs font-black uppercase tracking-widest"
                                        >
                                            Clear browsing data
                                        </button>
                                        {registered ? (
                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={downloadMyDataZip}
                                                className={cn(
                                                    "inline-flex items-center justify-center gap-2 rounded-2xl border-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
                                                    user.isPremium || user.subscription === "pro"
                                                        ? "border-secondary/40 bg-secondary/10 text-foreground hover:bg-secondary/20"
                                                        : "border-ui-muted bg-foreground/[0.03] text-muted opacity-80"
                                                )}
                                            >
                                                {user.isPremium || user.subscription === "pro" ? (
                                                    <Table2 size={16} />
                                                ) : (
                                                    <Shield size={14} className="text-primary" />
                                                )}
                                                Download CSV (ZIP)
                                                {!(user.isPremium || user.subscription === "pro") && (
                                                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[8px] text-primary">
                                                        PRO
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={downloadMyDataPdf}
                                                className={cn(
                                                    "inline-flex items-center justify-center gap-2 rounded-2xl border-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
                                                    user.isPremium || user.subscription === "pro"
                                                        ? "border-secondary/40 bg-secondary/10 text-foreground hover:bg-secondary/20"
                                                        : "border-ui-muted bg-foreground/[0.03] text-muted opacity-80"
                                                )}
                                            >
                                                {user.isPremium || user.subscription === "pro" ? (
                                                    <FileDown size={16} />
                                                ) : (
                                                    <Shield size={14} className="text-primary" />
                                                )}
                                                Download data PDF
                                                {!(user.isPremium || user.subscription === "pro") && (
                                                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[8px] text-primary">
                                                        PRO
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                        ) : null}
                                    </div>
                                    {registered ? (
                                        <div className="border-t border-destructive/30 pt-6">
                                            <h3 className="text-sm font-black text-destructive">Delete account</h3>
                                            <p className="mt-1 text-xs text-muted">
                                                Type your password to confirm if your account uses one; Google-only accounts can
                                                confirm with an empty field.
                                            </p>
                                            <input
                                                type="password"
                                                value={deleteConfirm}
                                                onChange={(e) => setDeleteConfirm(e.target.value)}
                                                placeholder="Current password"
                                                className="mt-3 w-full max-w-sm rounded-xl border border-ui bg-background px-4 py-2.5 text-sm"
                                            />
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={deleteAccount}
                                                className="mt-3 rounded-2xl bg-destructive/90 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white"
                                            >
                                                Delete account permanently
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </section>

                            <section id="section-appearance" className="scroll-mt-8 space-y-4">
                                <h2 className="text-lg font-black text-foreground">Appearance</h2>
                                <div className="glass-card space-y-6 rounded-3xl border-2 border-ui p-6">
                                    <label className="block max-w-xs">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Theme</span>
                                        <select
                                            value={merged.appearance.theme}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    appearance: { ...prev.appearance, theme: v },
                                                }));
                                                if (v === "light" || v === "dark") setTheme(v);
                                                if (v === "midnight") setTheme("dark");
                                            }}
                                            className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-medium"
                                        >
                                            <option value="dark">Dark</option>
                                            <option value="light">Light</option>
                                            <option value="midnight">Midnight</option>
                                        </select>
                                    </label>
                                    <label className="block max-w-xs">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">UI density</span>
                                        <select
                                            value={merged.appearance.density}
                                            onChange={(e) =>
                                                setSettings((prev) => ({
                                                    ...prev,
                                                    appearance: { ...prev.appearance, density: e.target.value },
                                                }))
                                            }
                                            className="mt-1 w-full rounded-xl border border-ui bg-background px-4 py-2.5 text-sm font-medium"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="compact">Compact</option>
                                        </select>
                                    </label>
                                    <p className="text-xs text-muted">
                                        Dashboard density is saved to your account; full layout support may roll out in a future
                                        update.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => patchSettings({ appearance: merged.appearance })}
                                        className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                                    >
                                        Save appearance
                                    </button>
                                </div>
                            </section>

                            {registered ? (
                                <section id="section-billing" className="scroll-mt-8 space-y-4">
                                    <h2 className="text-lg font-black text-foreground">Subscription & billing</h2>
                                    <div className="glass-card space-y-4 rounded-3xl border-2 border-ui p-6">
                                        <div className="flex flex-wrap items-end justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted">Current plan</p>
                                                <p className="text-2xl font-black capitalize text-foreground">
                                                    {user.subscription === "pro" || user.isPremium ? "Pro" : "Free"}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {user.subscription === "pro" || user.isPremium
                                                        ? "Premium features unlocked."
                                                        : "Upgrade for advanced AI and insights."}
                                                </p>
                                            </div>
                                            <Link
                                                href="/upgrade"
                                                className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white"
                                            >
                                                Upgrade
                                            </Link>
                                        </div>
                                        {(user.subscription === "pro" || user.isPremium) && user.stripeCustomerId ? (
                                            <div className="border-t border-ui pt-4">
                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={openBillingPortal}
                                                    className="rounded-2xl border-2 border-ui px-5 py-2.5 text-xs font-black uppercase tracking-widest"
                                                >
                                                    Manage or cancel subscription
                                                </button>
                                                <p className="mt-2 text-xs text-muted">
                                                    Opens Stripe Customer Portal to update payment method or cancel.
                                                </p>
                                            </div>
                                        ) : null}
                                        {(user.subscription === "pro" || user.isPremium) && !user.stripeCustomerId ? (
                                            <p className="text-xs text-muted">
                                                Subscription active; billing management may be unavailable until Stripe customer ID
                                                is linked.
                                            </p>
                                        ) : null}
                                    </div>
                                </section>
                            ) : null}

                            <div className="flex justify-end border-t border-ui pt-8">
                                <button
                                    type="button"
                                    onClick={() => logout()}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-destructive"
                                >
                                    <LogOut size={16} />
                                    Sign out
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
