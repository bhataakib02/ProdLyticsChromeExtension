"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
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

export default function GoalsView() {
    const { user } = useAuth();
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
            }
        } catch (err) {
            console.error("error fetching objectives:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveObjective(e) {
        e.preventDefault();
        try {
            let res;
            if (editingObjective) {
                res = await goalsService.updateObjective(editingObjective._id, newObjective);
                setObjectives(objectives.map(g => g._id === res._id ? res : g));
            } else {
                res = await goalsService.createObjective(newObjective);
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
        setNewObjective({ label: goal.label, targetSeconds: goal.targetSeconds, type: goal.type, website: goal.website || "" });
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

    if (!user) return null;

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold  tracking-tight">Goals & Targets</h1>
                    <p className="text-muted mt-2 ">Define your productivity boundaries and track your progress.</p>
                </div>
                <button onClick={() => setShowNewObjective(true)} className="bg-primary text-background px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
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
                        <button onClick={() => setShowNewObjective(true)} className="bg-white/10 px-8 py-3 rounded-2xl font-bold mt-4">Create Your First Objective</button>
                    </div>
                ) : (
                    objectives.map((goal) => (
                        <div key={goal._id} className="glass-card p-8 group hover:border-primary/50 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl ${goal.type === 'productive' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                    {goal.type === 'productive' ? <Zap size={24} /> : <Target size={24} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEditModal(goal)} className="p-2 text-muted hover:text-primary"><Pencil size={18} /></button>
                                    <button onClick={() => removeObjective(goal._id)} className="p-2 text-muted hover:text-danger"><Trash2 size={18} /></button>
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
                                    <span>{goal.progress || 0}%</span>
                                </div>
                                <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, goal.progress || 0)}%` }} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AnimatePresence>
                {showNewObjective && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card w-full max-w-md p-8 relative shadow-2xl">
                            <button onClick={() => setShowNewObjective(false)} className="absolute top-6 right-6 text-muted"><X size={24} /></button>
                            <h2 className="text-3xl font-bold mb-8">{editingObjective ? "Edit Objective" : "Set Objective"}</h2>
                            <form onSubmit={handleSaveObjective} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted uppercase tracking-widest">Name</label>
                                    <input required className="w-full bg-foreground/5 border border-white/10 rounded-xl px-4 py-3 outline-none" value={newObjective.label} onChange={e => setNewObjective({ ...newObjective, label: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Hrs" className="bg-foreground/5 border border-white/10 rounded-xl px-4 py-3" value={Math.floor(newObjective.targetSeconds / 3600)} onChange={e => setNewObjective({ ...newObjective, targetSeconds: (parseInt(e.target.value || 0) * 3600) + (newObjective.targetSeconds % 3600) })} />
                                    <input type="number" placeholder="Min" className="bg-foreground/5 border border-white/10 rounded-xl px-4 py-3" value={Math.floor((newObjective.targetSeconds % 3600) / 60)} onChange={e => setNewObjective({ ...newObjective, targetSeconds: (Math.floor(newObjective.targetSeconds / 3600) * 3600) + (parseInt(e.target.value || 0) * 60) })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <select className="bg-foreground/5 border border-white/10 rounded-xl px-4 py-3" value={newObjective.type} onChange={e => setNewObjective({ ...newObjective, type: e.target.value })}>
                                        <option value="productive">Productive</option>
                                        <option value="unproductive">Limit (Max)</option>
                                    </select>
                                    <input required placeholder="Website" className="bg-foreground/5 border border-white/10 rounded-xl px-4 py-3" value={newObjective.website} onChange={e => setNewObjective({ ...newObjective, website: e.target.value })} />
                                </div>
                                <button type="submit" className="w-full bg-primary text-background font-bold py-4 rounded-2xl mt-4">{editingObjective ? "Update Objective" : "Create Objective"}</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {celebratedObjective && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="glass-card w-full max-w-sm p-10 text-center shadow-2xl border-primary/20">
                            <Trophy size={64} className="mx-auto text-yellow-400 mb-6" />
                            <h2 className="text-3xl font-black mb-2">Objective Achieved!</h2>
                            <p className="mb-8">{celebratedObjective.label || celebratedObjective.website}</p>
                            <button onClick={() => setCelebratedObjective(null)} className="w-full bg-primary text-background font-bold py-4 rounded-2xl">Awesome!</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
