"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { matchesActivitySearch } from "@/lib/activitySearch";
import { goalsService } from "@/services/goals.service";
import { todayDateKeyClient } from "@/lib/trackingClientRange";
import { Target, Plus, Trophy, Flame, X, Trash2, Zap, Pencil, Award, CheckCircle2, CopyPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { requestExtensionWorkspaceToast } from "@/lib/extensionSync";
import { normalizeWebsiteHost } from "@/lib/normalizeWebsiteHost";
import { splitGoalWebsiteForStorage } from "@/lib/goalWebsiteSpec";

function goalHasPinnedDay(goal) {
    const dk = goal?.dateKey;
    return dk != null && String(dk).trim() !== "";
}

function displayGoalWebsiteField(goal) {
    if (!goal) return "";
    const w = goal.website || "";
    if (w === "*") return "*";
    const p = goal.pathPrefix && typeof goal.pathPrefix === "string" ? goal.pathPrefix : "";
    return `${w}${p}`;
}

export default function GoalsView() {
    const { user } = useAuth();
    const { activitySearchQuery } = useDashboard();
    const [todayGoals, setTodayGoals] = useState([]);
    const [yesterdayGoals, setYesterdayGoals] = useState([]);
    const [dateMeta, setDateMeta] = useState({ todayDateKey: "", yesterdayDateKey: "" });
    const [showNewObjective, setShowNewObjective] = useState(false);
    const [celebratedObjective, setCelebratedObjective] = useState(null);
    const [editingObjective, setEditingObjective] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newObjective, setNewObjective] = useState({
        label: "",
        targetSeconds: 3600,
        type: "productive",
        website: "",
    });

    useEffect(() => {
        if (user) {
            synchronizeObjectives();
        }
    }, [user]);

    async function synchronizeObjectives() {
        setLoading(true);
        try {
            const data = await goalsService.getObjectives();
            const today = Array.isArray(data?.today) ? data.today : Array.isArray(data) ? data : [];
            const yesterday = Array.isArray(data?.yesterday) ? data.yesterday : [];
            setTodayGoals(today);
            setYesterdayGoals(yesterday);
            setDateMeta({
                todayDateKey: data?.todayDateKey || "",
                yesterdayDateKey: data?.yesterdayDateKey || "",
            });

            const newlyCompleted = today.find(
                (g) =>
                    g.type === "productive" &&
                    g.metToday &&
                    !sessionStorage.getItem(`celebrated_${g._id}`)
            );
            if (newlyCompleted) {
                setCelebratedObjective(newlyCompleted);
                sessionStorage.setItem(`celebrated_${newlyCompleted._id}`, "true");
                const name = String(newlyCompleted.label || newlyCompleted.website || "Objective").trim() || "Objective";
                const siteRaw = String(newlyCompleted.website || "").trim();
                const targetHost =
                    siteRaw && siteRaw !== "*"
                        ? normalizeWebsiteHost(siteRaw) || siteRaw.replace(/^www\./i, "").toLowerCase()
                        : "";
                requestExtensionWorkspaceToast({
                    title: "Objective achieved",
                    message: `${name} — you hit today's target. Great work.`,
                    systemNotify: true,
                    targetHost: targetHost || undefined,
                });
            }
        } catch (err) {
            console.error("error fetching objectives:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveObjective(e) {
        e.preventDefault();
        const website = String(newObjective.website || "").trim();
        if (!website) {
            window.alert("Enter a valid website or URL (e.g. twitter.com or https://www.twitter.com).");
            return;
        }
        if (website !== "*") {
            const { host } = splitGoalWebsiteForStorage(website);
            if (!host) {
                window.alert("Enter a valid website or URL (e.g. twitter.com or https://www.twitter.com).");
                return;
            }
        }
        const base = { ...newObjective, website };
        try {
            if (editingObjective) {
                await goalsService.updateObjective(editingObjective._id, {
                    ...base,
                    dateKey: editingObjective.dateKey != null ? editingObjective.dateKey : "",
                });
            } else {
                const dk = todayDateKeyClient();
                await goalsService.createObjective(dk ? { ...base, dateKey: dk } : base);
            }
            setShowNewObjective(false);
            setEditingObjective(null);
            setNewObjective({ label: "", targetSeconds: 3600, type: "productive", website: "" });
            await synchronizeObjectives();
        } catch (err) {
            console.error("error saving objective:", err);
        }
    }

    async function copyGoalToToday(goal) {
        const dk = todayDateKeyClient();
        if (!dk) {
            window.alert("Could not read your local date. Try again from the dashboard.");
            return;
        }
        try {
            await goalsService.createObjective({
                label: goal.label,
                targetSeconds: goal.targetSeconds,
                type: goal.type,
                website: displayGoalWebsiteField(goal),
                dateKey: dk,
            });
            await synchronizeObjectives();
        } catch (err) {
            console.error("error copying objective:", err);
        }
    }

    const openEditModal = (goal) => {
        setEditingObjective(goal);
        setNewObjective({
            label: goal.label,
            targetSeconds: goal.targetSeconds,
            type: goal.type,
            website: displayGoalWebsiteField(goal),
        });
        setShowNewObjective(true);
    };

    async function removeObjective(id) {
        try {
            await goalsService.deleteObjective(id);
            await synchronizeObjectives();
        } catch (err) {
            console.error("error deleting objective");
        }
    }

    function formatDurationShort(seconds) {
        const s = Math.max(0, Number(seconds) || 0);
        if (s <= 0) return "0m";
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    /** Compact goal time: tracked vs target (e.g. 6m / 1m or 0m / 1m max). */
    function compactGoalTime(goal, trackedSeconds) {
        const t = formatDurationShort(trackedSeconds);
        const tgt = formatDurationShort(goal.targetSeconds);
        if (goal.type === "unproductive") {
            return `${t} / ${tgt} max`;
        }
        return `${t} / ${tgt}`;
    }

    function formatDayLabel(dateKey) {
        if (!dateKey || typeof dateKey !== "string") return "";
        const parts = dateKey.split("-").map(Number);
        if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return dateKey;
        const [y, mo, d] = parts;
        const dt = new Date(y, mo - 1, d);
        return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    }

    if (!user) return null;

    const filteredToday = todayGoals.filter((g) =>
        matchesActivitySearch(activitySearchQuery, g.label, g.website, g.pathPrefix, g.type)
    );
    const filteredYesterday = yesterdayGoals.filter((g) =>
        matchesActivitySearch(activitySearchQuery, g.label, g.website, g.pathPrefix, g.type)
    );

    const totalCount = todayGoals.length + yesterdayGoals.length;
    const fieldLabel =
        "block text-[10px] font-black uppercase tracking-widest text-foreground/65";
    const fieldBase =
        "w-full rounded-xl border-2 border-ui bg-background px-4 py-3 text-foreground outline-none transition-shadow placeholder:text-muted focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/35";

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto relative text-foreground">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold  tracking-tight">Goals & Targets</h1>
                </div>
                <button type="button" onClick={() => setShowNewObjective(true)} className="btn-primary">
                    <Plus size={20} /> Set Objective
                </button>
            </header>

            {loading ? (
                <div className="py-20 text-center text-muted italic">Analyzing objectives...</div>
            ) : totalCount === 0 ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center space-y-4">
                    <Target size={48} className="text-muted/20" />
                    <h3 className="text-xl font-bold ">No objectives for today yet</h3>
                    <p className="text-sm text-muted max-w-md">
                        Add goals for today with Set Objective. Tomorrow, add again if you want the same targets.
                    </p>
                    <button type="button" onClick={() => setShowNewObjective(true)} className="btn-secondary mt-4 px-8">
                        Add today&apos;s goals
                    </button>
                </div>
            ) : (
                <>
                    {yesterdayGoals.length > 0 && (
                        <section className="space-y-4">
                            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                                <span className="text-muted font-medium text-sm uppercase tracking-widest">Yesterday</span>
                                <span className="text-foreground">
                                    {formatDayLabel(dateMeta.yesterdayDateKey) || dateMeta.yesterdayDateKey}
                                </span>
                            </h2>
                            {filteredYesterday.length === 0 && yesterdayGoals.length > 0 ? (
                                <p className="text-sm text-muted">No yesterday goals match your search.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredYesterday.map((goal) => (
                                        <div
                                            key={goal._id}
                                            className="glass-card p-8 border-foreground/10 bg-foreground/[0.02]"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div
                                                    className={`p-3 rounded-2xl ${
                                                        goal.type === "productive"
                                                            ? "bg-primary/10 text-primary"
                                                            : "bg-secondary/10 text-secondary"
                                                    }`}
                                                >
                                                    {goal.type === "productive" ? <Zap size={24} /> : <Target size={24} />}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyGoalToToday(goal)}
                                                        className="btn-ghost"
                                                        title="Add same goal for today"
                                                        aria-label="Add same goal for today"
                                                    >
                                                        <CopyPlus size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeObjective(goal._id)}
                                                        className="btn-ghost hover:text-danger"
                                                        aria-label="Delete objective"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold  mb-2">
                                                {goal.label || displayGoalWebsiteField(goal)}
                                            </h3>
                                            <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest mb-4">
                                                <span
                                                    className={
                                                        goal.type === "productive" ? "text-primary" : "text-secondary"
                                                    }
                                                >
                                                    {goal.type}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    {Math.floor(goal.targetSeconds / 3600)}h{" "}
                                                    {Math.floor((goal.targetSeconds % 3600) / 60)}m Target
                                                </span>
                                            </div>
                                            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.04] p-4 space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                        {formatDayLabel(goal.displayDateKey)}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-muted tabular-nums">
                                                        {compactGoalTime(goal, goal.currentSeconds)}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {goal.metToday ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 size={15} className="shrink-0" aria-hidden />
                                                                {goal.type === "productive" ? "Done" : "OK"}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                                Not met
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-bold text-muted tabular-nums">
                                                            {Math.min(100, Math.max(0, Number(goal.progress) || 0))}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/8">
                                                    <div
                                                        className={`h-full transition-[width] duration-300 ${
                                                            goal.metToday ? "bg-emerald-500/90" : "bg-foreground/25"
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, Number(goal.progress) || 0))}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    <section className="space-y-4">
                        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                            <span className="text-primary font-medium text-sm uppercase tracking-widest">Today</span>
                            <span className="text-foreground">
                                {formatDayLabel(dateMeta.todayDateKey) || dateMeta.todayDateKey}
                            </span>
                        </h2>
                        {filteredToday.length === 0 && todayGoals.length > 0 ? (
                            <p className="text-sm text-muted">No today goals match your search.</p>
                        ) : filteredToday.length === 0 ? (
                            <div className="glass-card p-12 text-center space-y-3">
                                <p className="text-muted">
                                    You haven&apos;t added any goals for today yet. Use Set Objective to choose what you want to
                                    track.
                                </p>
                                <button type="button" onClick={() => setShowNewObjective(true)} className="btn-primary">
                                    <Plus size={18} /> Add today&apos;s goals
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredToday.map((goal) => (
                                    <div key={goal._id} className="glass-card p-8 group hover:border-primary/50 transition-all">
                                        <div className="flex justify-between items-start mb-6">
                                            <div
                                                className={`p-3 rounded-2xl ${
                                                    goal.type === "productive"
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-secondary/10 text-secondary"
                                                }`}
                                            >
                                                {goal.type === "productive" ? <Zap size={24} /> : <Target size={24} />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(goal)}
                                                    className="btn-ghost"
                                                    aria-label="Edit objective"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeObjective(goal._id)}
                                                    className="btn-ghost hover:text-danger"
                                                    aria-label="Delete objective"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold  mb-2">
                                            {goal.label || displayGoalWebsiteField(goal)}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest mb-4">
                                            <span
                                                className={goal.type === "productive" ? "text-primary" : "text-secondary"}
                                            >
                                                {goal.type}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {Math.floor(goal.targetSeconds / 3600)}h{" "}
                                                {Math.floor((goal.targetSeconds % 3600) / 60)}m Target
                                            </span>
                                        </div>
                                        {(Number(goal.hitStreakDays) > 0 || Number(goal.totalDaysHit) > 0) && (
                                            <div className="flex flex-wrap gap-2 mb-5">
                                                {Number(goal.hitStreakDays) > 0 && (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/12 text-orange-700 dark:text-orange-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
                                                        title="Consecutive calendar days this goal was met (today counts if you already met it; otherwise yesterday starts the chain)"
                                                    >
                                                        <Flame size={14} className="shrink-0" aria-hidden />
                                                        {goal.hitStreakDays}-day streak
                                                    </span>
                                                )}
                                                {Number(goal.totalDaysHit) > 0 && (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 rounded-full bg-foreground/6 text-foreground/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
                                                        title="Days in the last ~2 years with tracking on record where this goal was met"
                                                    >
                                                        <Award size={14} className="shrink-0 text-primary" aria-hidden />
                                                        {goal.totalDaysHit} days met
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {goal.yesterdayDateKey && !goalHasPinnedDay(goal) && (
                                            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.04] p-4 mb-5 space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                        Yesterday · {formatDayLabel(goal.yesterdayDateKey)}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-muted tabular-nums">
                                                        {compactGoalTime(goal, goal.yesterdaySeconds)}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {goal.metYesterday ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 size={15} className="shrink-0" aria-hidden />
                                                                {goal.type === "productive" ? "Done" : "OK"}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                                Not met
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-bold text-muted tabular-nums">
                                                            {Math.min(100, Math.max(0, Number(goal.yesterdayProgress) || 0))}%
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/8">
                                                    <div
                                                        className={`h-full transition-[width] duration-300 ${
                                                            goal.metYesterday
                                                                ? "bg-emerald-500/90"
                                                                : "bg-foreground/25"
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, Number(goal.yesterdayProgress) || 0))}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted shrink-0">
                                                    Progress
                                                </span>
                                                <span className="text-[11px] font-semibold text-muted tabular-nums min-w-0 text-center flex-1 px-1">
                                                    {compactGoalTime(goal, goal.currentSeconds)}
                                                    {goal.metToday && goal.type === "productive" && (
                                                        <span className="text-primary"> · Met</span>
                                                    )}
                                                    {goal.metToday && goal.type === "unproductive" && (
                                                        <span className="text-primary"> · Under max</span>
                                                    )}
                                                </span>
                                                <span className="text-xs font-bold text-muted tabular-nums shrink-0">
                                                    {Math.min(100, Math.max(0, Number(goal.progress) || 0))}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
                                                <div
                                                    className="h-full bg-primary transition-[width] duration-300"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, Number(goal.progress) || 0))}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            <AnimatePresence>
                {showNewObjective && (
                    <div className="modal-backdrop">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="modal-panel"
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewObjective(false);
                                    setEditingObjective(null);
                                }}
                                className="btn-ghost absolute right-6 top-6"
                                aria-label="Close"
                            >
                                <X size={22} />
                            </button>
                            <h2 className="mb-2 text-3xl font-bold text-foreground">
                                {editingObjective ? "Edit Objective" : "Set Objective"}
                            </h2>
                            <p className="mb-8 text-sm text-muted">
                                {editingObjective ? "Save changes to this goal." : "New goals apply to today only."}
                            </p>
                            <form onSubmit={handleSaveObjective} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="objective-name" className={fieldLabel}>
                                        Name
                                    </label>
                                    <input
                                        id="objective-name"
                                        required
                                        className={fieldBase}
                                        value={newObjective.label}
                                        onChange={(e) => setNewObjective({ ...newObjective, label: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="objective-hrs" className={fieldLabel}>
                                            Hours
                                        </label>
                                        <input
                                            id="objective-hrs"
                                            type="number"
                                            min={0}
                                            placeholder="0"
                                            className={fieldBase}
                                            value={Math.floor(newObjective.targetSeconds / 3600)}
                                            onChange={(e) =>
                                                setNewObjective({
                                                    ...newObjective,
                                                    targetSeconds:
                                                        (parseInt(e.target.value || "0", 10) || 0) * 3600 +
                                                        (newObjective.targetSeconds % 3600),
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="objective-min" className={fieldLabel}>
                                            Minutes
                                        </label>
                                        <input
                                            id="objective-min"
                                            type="number"
                                            min={0}
                                            max={59}
                                            placeholder="0"
                                            className={fieldBase}
                                            value={Math.floor((newObjective.targetSeconds % 3600) / 60)}
                                            onChange={(e) =>
                                                setNewObjective({
                                                    ...newObjective,
                                                    targetSeconds:
                                                        Math.floor(newObjective.targetSeconds / 3600) * 3600 +
                                                        (parseInt(e.target.value || "0", 10) || 0) * 60,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="objective-type" className={fieldLabel}>
                                            Type
                                        </label>
                                        <select
                                            id="objective-type"
                                            className={`${fieldBase} cursor-pointer`}
                                            value={newObjective.type}
                                            onChange={(e) => setNewObjective({ ...newObjective, type: e.target.value })}
                                        >
                                            <option value="productive">Productive</option>
                                            <option value="unproductive">Limit (Max)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="objective-website" className={fieldLabel}>
                                            Website
                                        </label>
                                        <input
                                            id="objective-website"
                                            required
                                            placeholder="youtube.com or youtube.com/watch (no ?query — privacy)"
                                            className={fieldBase}
                                            value={newObjective.website}
                                            onChange={(e) =>
                                                setNewObjective({ ...newObjective, website: e.target.value })
                                            }
                                            onBlur={() => {
                                                setNewObjective((prev) => ({
                                                    ...prev,
                                                    website: String(prev.website || "").trim(),
                                                }));
                                            }}
                                            autoComplete="url"
                                            inputMode="url"
                                        />
                                        <p className="text-[10px] font-medium text-muted/90 leading-snug">
                                            <strong className="text-foreground/90">Host only</strong> (e.g.{" "}
                                            <code className="text-foreground/80">wikipedia.org</code>): goal progress
                                            uses <em>all</em> tracked time on that host (every path)—same data the
                                            extension sends. Add a <strong className="text-foreground/90">path</strong>{" "}
                                            (e.g.{" "}
                                            <code className="text-foreground/80">wikipedia.org/wiki/foo</code>) to
                                            limit to a section. Query strings and hashes are not stored. Progress for
                                            an objective starts from when you save it; Analytics still shows full site
                                            time for the day.
                                        </p>
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary-lg mt-4">
                                    {editingObjective ? "Update Objective" : "Create Objective"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {celebratedObjective && (
                    <div className="modal-backdrop z-[60]">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="modal-panel modal-panel-sm border-2 border-primary/35 p-10 text-center"
                        >
                            <Trophy size={64} className="mx-auto mb-6 text-yellow-400" />
                            <h2 className="mb-2 text-3xl font-black text-foreground">Objective Achieved!</h2>
                            <p className="mb-8 text-foreground/90">
                                {celebratedObjective.label || celebratedObjective.website}
                            </p>
                            <button type="button" onClick={() => setCelebratedObjective(null)} className="btn-primary-lg">
                                Awesome!
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
