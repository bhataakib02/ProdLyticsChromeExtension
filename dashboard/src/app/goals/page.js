"use client";

import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/context/AuthContext";
import axios from "axios";
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

export default function GoalsPage() {
    const { user } = useAuth();
    const [goals, setGoals] = useState([]);
    const [showNewGoal, setShowNewGoal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newGoal, setNewGoal] = useState({
        label: "",
        targetSeconds: 3600,
        type: "productive",
        website: ""
    });

    useEffect(() => {
        if (user) {
            fetchGoals();
        }
    }, [user]);

    async function fetchGoals() {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await axios.get(`${API_URL}/goals/progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGoals(res.data);
        } catch (err) {
            console.error("❌ Error fetching goals:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateGoal(e) {
        e.preventDefault();
        try {
            const token = localStorage.getItem("accessToken");
            console.log("✈️ Sending Goal Request:", { mode: editingGoal ? "PUT" : "POST", goal: newGoal, url: editingGoal ? `${API_URL}/goals/${editingGoal._id}` : `${API_URL}/goals` });
            let res;
            if (editingGoal) {
                // Update existing goal
                res = await axios.put(`${API_URL}/goals/${editingGoal._id}`, newGoal, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setGoals(goals.map(g => g._id === res.data._id ? res.data : g));
            } else {
                // Create new goal
                res = await axios.post(`${API_URL}/goals`, newGoal, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setGoals([...goals, res.data]);
            }
            setShowNewGoal(false);
            setEditingGoal(null);
            setNewGoal({ label: "", targetSeconds: 3600, type: "productive", website: "" });
        } catch (err) {
            console.error("❌ Error creating/updating goal:", err.response?.data || err.message);
        }
    }

    const openEditModal = (goal) => {
        setEditingGoal(goal);
        setNewGoal({
            label: goal.label,
            targetSeconds: goal.targetSeconds,
            type: goal.type,
            website: goal.website || ""
        });
        setShowNewGoal(true);
    };

    async function handleDeleteGoal(id) {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.delete(`${API_URL}/goals/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGoals(goals.filter(g => g._id !== id));
        } catch (err) {
            console.error("Error deleting goal");
        }
    }

    if (!user) return null;

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold font-outfit tracking-tight">Goals & Targets</h1>
                    <p className="text-muted mt-2 font-inter">Define your productivity boundaries and track your progress.</p>
                </div>
                <button
                    onClick={() => setShowNewGoal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    Set New Goal
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-muted italic">Analyzing your objectives...</div>
                ) : goals.length === 0 ? (
                    <div className="col-span-full glass-card p-20 flex flex-col items-center justify-center text-center space-y-4">
                        <Target size={48} className="text-muted/20" />
                        <h3 className="text-xl font-bold font-outfit">No goals set yet</h3>
                        <p className="text-muted text-sm max-w-xs font-inter">Break your day into measurable targets to stay focused and productive.</p>
                        <button onClick={() => setShowNewGoal(true)} className="btn-secondary mt-4">Create Your First Goal</button>
                    </div>
                ) : (
                    goals.map((goal) => (
                        <div key={goal._id} className="glass-card p-8 group hover:border-primary/50 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl ${goal.type === 'productive' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                                    {goal.type === 'productive' ? <Zap size={24} /> : <Target size={24} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(goal)}
                                        className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        title="Edit Goal"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("Are you sure you want to delete this goal?")) {
                                                handleDeleteGoal(goal._id);
                                            }
                                        }}
                                        className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                        title="Delete Goal"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold font-outfit mb-2">{goal.label || goal.website}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-muted font-black uppercase tracking-widest mb-6">
                                <span className={goal.type === 'productive' ? 'text-primary' : 'text-accent'}>{goal.type}</span>
                                <span>•</span>
                                <span>{Math.floor(goal.targetSeconds / 3600)}h {Math.floor((goal.targetSeconds % 3600) / 60)}m Target</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-muted">Progress</span>
                                    <span>0h / {Math.floor(goal.targetSeconds / 3600)}h</span>
                                </div>
                                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-0" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal for New Goal */}
            <AnimatePresence>
                {showNewGoal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="glass-card w-full max-w-md p-8 relative shadow-2xl border-primary/20"
                        >
                            <button
                                onClick={() => {
                                    setShowNewGoal(false);
                                    setEditingGoal(null);
                                    setNewGoal({ label: "", targetSeconds: 3600, type: "productive", website: "" });
                                }}
                                className="absolute top-6 right-6 text-muted hover:text-foreground transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="mb-8">
                                <h1 className="text-3xl font-bold font-outfit text-foreground">
                                    {editingGoal ? "Edit Goal" : "Set New Goal"}
                                </h1>
                                <p className="text-sm text-muted font-inter mt-1">
                                    {editingGoal ? "Refine your productivity targets." : "Define your target and start tracking."}
                                </p>
                            </div>

                            <form onSubmit={handleCreateGoal} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Goal Name</label>
                                    <input
                                        required
                                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm text-foreground"
                                        placeholder="e.g. Deep Work Session"
                                        value={newGoal.label}
                                        onChange={e => setNewGoal({ ...newGoal, label: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Target Time</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm pr-12 text-foreground"
                                                placeholder="0"
                                                value={Math.floor(newGoal.targetSeconds / 3600)}
                                                onChange={e => {
                                                    const h = parseInt(e.target.value) || 0;
                                                    const m = Math.floor((newGoal.targetSeconds % 3600) / 60);
                                                    setNewGoal({ ...newGoal, targetSeconds: (h * 3600) + (m * 60) });
                                                }}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-muted font-black group-focus-within:text-primary uppercase">HRS</span>
                                        </div>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm pr-12 text-foreground"
                                                placeholder="0"
                                                value={Math.floor((newGoal.targetSeconds % 3600) / 60)}
                                                onChange={e => {
                                                    const m = parseInt(e.target.value) || 0;
                                                    const h = Math.floor(newGoal.targetSeconds / 3600);
                                                    setNewGoal({ ...newGoal, targetSeconds: (h * 3600) + (m * 60) });
                                                }}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-muted font-black group-focus-within:text-primary uppercase">MIN</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Goal Type</label>
                                        <select
                                            className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm appearance-none cursor-pointer text-foreground"
                                            value={newGoal.type}
                                            onChange={e => setNewGoal({ ...newGoal, type: e.target.value })}
                                        >
                                            <option value="productive" className="bg-background text-foreground">Productive</option>
                                            <option value="unproductive" className="bg-background text-foreground">Limit (Max)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Website (Optional)</label>
                                        <input
                                            className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm text-foreground"
                                            placeholder="e.g. github.com"
                                            value={newGoal.website}
                                            onChange={e => setNewGoal({ ...newGoal, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="w-full bg-primary text-background font-bold py-4 rounded-2xl hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 active:scale-95 text-sm mt-4">
                                    {editingGoal ? "Update Goal Target" : "Create Goal Target"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function GoalStat({ icon, label, value }) {
    return (
        <div className="glass-card p-6 flex items-center gap-4">
            <div className="p-3 bg-foreground/5 rounded-xl">{icon}</div>
            <div>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">{label}</p>
                <p className="text-2xl font-bold">{value === "--" ? value : value}</p>
            </div>
        </div>
    );
}

function GoalItem({ title, category, progress, currentSeconds, targetSeconds, onDelete }) {
    const formatDuration = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <motion.div
            whileHover={{ x: 5 }}
            className="glass-card p-5 flex flex-col md:flex-row items-center justify-between group gap-4"
        >
            <div className="flex items-center gap-5 flex-1 w-full">
                <div className="cursor-pointer">
                    {progress === 100 ? (
                        <CheckCircle2 className="text-primary" size={24} />
                    ) : (
                        <Circle className="text-muted group-hover:text-primary transition-colors" size={24} />
                    )}
                </div>
                <div>
                    <h3 className={`font-semibold ${progress === 100 ? 'line-through text-muted' : ''}`}>{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-black tracking-tighter ${category === 'productive' ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                            {category}
                        </span>
                        <span className="text-[10px] text-muted font-bold">{formatDuration(currentSeconds)} / {formatDuration(targetSeconds)}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8 w-full md:w-80">
                <div className="flex-1 h-2 bg-foreground/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full ${category === 'unproductive' && progress > 90 ? 'bg-red-500' : 'bg-primary'}`}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono w-8 text-right">{progress}%</span>
                    <button onClick={onDelete} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all md:opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
