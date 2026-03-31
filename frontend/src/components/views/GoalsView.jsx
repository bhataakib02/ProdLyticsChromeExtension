"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { matchesActivitySearch } from "@/lib/activitySearch";
import { goalsService } from "@/services/goals.service";
import {
    Target,
    CheckCircle2,
    Circle,
    Plus,
    Trophy,
    Flame,
    X,
    Trash2,
    Zap,
    Pencil,
    ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { requestExtensionWorkspaceToast } from "@/lib/extensionSync";
import { normalizeWebsiteHost } from "@/lib/normalizeWebsiteHost";

export default function GoalsView() {
    const { user } = useAuth();
    const { activitySearchQuery } = useDashboard();
    const [objectives, setObjectives] = useState([]);
    const [showNewObjective, setShowNewObjective] = useState(false);
    const [celebratedObjective, setCelebratedObjective] = useState(null);
    const [editingObjective, setEditingObjective] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newObjective, setNewObjective] = useState({
        label: "",
        targetSeconds: 3600,
        type: "productive",
        website: ""
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
            setObjectives(data);
            const newlyCompleted = data.find(g => (g.currentSeconds || 0) >= g.targetSeconds && !sessionStorage.getItem(`celebrated_${g._id}`));
            if (newlyCompleted) {
                setCelebratedObjective(newlyCompleted);
                sessionStorage.setItem(`celebrated_${newlyCompleted._id}`, "true");
                const name = String(newlyCompleted.label || newlyCompleted.website || "Objective").trim() || "Objective";
                requestExtensionWorkspaceToast({
                    title: "Objective achieved",
                    message: `${name} — you hit today's target. Great work.`,
                    systemNotify: true,
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
        const website = normalizeWebsiteHost(newObjective.website);
        if (!website) {
            window.alert("Enter a valid website or URL (e.g. twitter.com or https://www.twitter.com).");
            return;
        }
        const payload = { ...newObjective, website };
        setNewObjective(payload);
        try {
            let res;
            if (editingObjective) {
                res = await goalsService.updateObjective(editingObjective._id, payload);
                setObjectives(objectives.map((g) => (g._id === res._id ? res : g)));
            } else {
                res = await goalsService.createObjective(payload);
                setObjectives([...objectives, res]);
            }
            setShowNewObjective(false);
            setEditingObjective(null);
            setNewObjective({ label: "", targetSeconds: 3600, type: "productive", website: "" });
        } catch (err) {
            console.error("error saving objective:", err);
        }
    }

    const openEditModal = (goal) => {
        setEditingObjective(goal);
        setNewObjective({
            label: goal.label,
            targetSeconds: goal.targetSeconds,
            type: goal.type,
            website: normalizeWebsiteHost(goal.website || "") || goal.website || "",
        });
        setShowNewObjective(true);
    };

    async function removeObjective(id) {
        try {
            await goalsService.deleteObjective(id);
            setObjectives(objectives.filter(g => g._id !== id));
        } catch (err) {
            console.error("error deleting objective");
        }
    }

    function formatTrackedToday(seconds) {
        const s = Number(seconds) || 0;
        if (s <= 0) return "0m";
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    if (!user) return null;

    const filteredObjectives = objectives.filter((g) =>
        matchesActivitySearch(activitySearchQuery, g.label, g.website, g.type)
    );

    const fieldLabel =
        "block text-[10px] font-black uppercase tracking-widest text-foreground/65";
    const fieldBase =
        "w-full rounded-xl border-2 border-ui bg-background px-4 py-3 text-foreground outline-none transition-shadow placeholder:text-muted focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/35";

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto relative text-foreground">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold  tracking-tight">Goals & Targets</h1>
                    <p className="text-muted mt-2 ">Define your productivity boundaries and track your progress.</p>
                </div>
                <button type="button" onClick={() => setShowNewObjective(true)} className="btn-primary">
                    <Plus size={20} /> Set Objective
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-muted italic">Analyzing objectives...</div>
                ) : objectives.length === 0 ? (
                    <div className="col-span-full glass-card p-20 flex flex-col items-center justify-center text-center space-y-4">
                        <Target size={48} className="text-muted/20" />
                        <h3 className="text-xl font-bold ">No objectives set yet</h3>
                        <button type="button" onClick={() => setShowNewObjective(true)} className="btn-secondary mt-4 px-8">
                            Create Your First Objective
                        </button>
                    </div>
                ) : filteredObjectives.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-sm text-muted">
                        No objectives match your search. Clear the navbar search or try another keyword.
                    </div>
                ) : (
                    filteredObjectives.map((goal) => (
                        <div key={goal._id} className="glass-card p-8 group hover:border-primary/50 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl ${goal.type === 'productive' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                    {goal.type === 'productive' ? <Zap size={24} /> : <Target size={24} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => openEditModal(goal)} className="btn-ghost" aria-label="Edit objective">
                                        <Pencil size={18} />
                                    </button>
                                    <button type="button" onClick={() => removeObjective(goal._id)} className="btn-ghost hover:text-danger" aria-label="Delete objective">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold  mb-2">{goal.label || goal.website}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest mb-6">
                                <span className={goal.type === 'productive' ? 'text-primary' : 'text-secondary'}>{goal.type}</span>
                                <span>•</span>
                                <span>{Math.floor(goal.targetSeconds / 3600)}h {Math.floor((goal.targetSeconds % 3600) / 60)}m Target</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-muted">Progress</span>
                                    <span>{Math.min(100, Math.max(0, Number(goal.progress) || 0))}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/5">
                                    <div
                                        className="h-full bg-primary transition-[width] duration-300"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, Number(goal.progress) || 0))}%`,
                                        }}
                                    />
                                </div>
                                <p className="text-[10px] font-medium text-muted">
                                    Today tracked: {formatTrackedToday(goal.currentSeconds)}
                                    {goal.targetSeconds > 0 &&
                                        (goal.currentSeconds || 0) >= goal.targetSeconds && (
                                            <span className="text-primary"> · Target met</span>
                                        )}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

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
                                onClick={() => setShowNewObjective(false)}
                                className="btn-ghost absolute right-6 top-6"
                                aria-label="Close"
                            >
                                <X size={22} />
                            </button>
                            <h2 className="mb-8 text-3xl font-bold text-foreground">
                                {editingObjective ? "Edit Objective" : "Set Objective"}
                            </h2>
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
                                            placeholder="twitter.com, www.x.com, or full URL"
                                            className={fieldBase}
                                            value={newObjective.website}
                                            onChange={(e) =>
                                                setNewObjective({ ...newObjective, website: e.target.value })
                                            }
                                            onBlur={() => {
                                                setNewObjective((prev) => {
                                                    const n = normalizeWebsiteHost(prev.website);
                                                    return n ? { ...prev, website: n } : prev;
                                                });
                                            }}
                                            autoComplete="url"
                                            inputMode="url"
                                        />
                                        <p className="text-[10px] font-medium text-muted/90 leading-snug">
                                            We normalize to the bare domain (no <code className="text-foreground/80">https://</code> or{" "}
                                            <code className="text-foreground/80">www.</code>) so progress matches extension tracking.
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
