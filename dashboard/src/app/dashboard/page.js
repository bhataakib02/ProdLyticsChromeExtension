/**
 * DASHBOARD OVERVIEW PAGE
 */
"use client";

import { useEffect, useState } from "react";
import { useAuth, API_URL } from "@/context/AuthContext";
import axios from "axios";
import { Activity, TrendingUp, Clock, Target, Zap, ArrowUpRight, Search, Bell, X, Plus, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { io } from "socket.io-client";

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        score: 0,
        totalTime: 0,
        productiveTime: 0,
        streak: 0,
        peakHour: null
    });
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [showNewGoal, setShowNewGoal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [newGoal, setNewGoal] = useState({
        label: "",
        targetSeconds: 3600,
        type: "productive",
        website: ""
    });

    useEffect(() => {
        if (user) {
            fetchAllData();

            // Setup Realtime WebSocket
            const socket = io("http://localhost:5003");
            socket.emit("authenticate", { userId: user.id });

            socket.on("live_dashboard_update", (event) => {
                console.log("Live Update:", event);
                // Optionally mutate stats in real time
            });

            socket.on("notification", (notif) => {
                setNotifications(prev => [...prev, { id: Date.now(), ...notif }]);
                setTimeout(() => {
                    setNotifications(prev => prev.slice(1));
                }, 5000);
            });

            return () => socket.disconnect();
        }
    }, [user]);

    async function fetchAllData() {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const headers = { Authorization: `Bearer ${token}` };

            const [statsRes, goalsRes] = await Promise.all([
                axios.get(`${API_URL}/tracking/stats`, { headers }),
                axios.get(`${API_URL}/goals`, { headers })
            ]);

            setStats(statsRes.data);
            setGoals(goalsRes.data);
        } catch (err) {
            console.error("Could not fetch dashboard data");
        } finally {
            setLoading(false);
        }
    }

    const handleCreateGoal = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("accessToken");
            let res;
            if (editingGoal) {
                res = await axios.put(`${API_URL}/goals/${editingGoal._id}`, newGoal, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setGoals(goals.map(g => g._id === res.data._id ? res.data : g));
            } else {
                res = await axios.post(`${API_URL}/goals/`, newGoal, {
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
    };

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

    const formatPeakHour = (hour) => {
        if (hour === null || hour === undefined) return "Calculating...";
        const h = hour % 12 || 12;
        const ampm = hour >= 12 ? "PM" : "AM";
        return `Peak @ ${h} ${ampm}`;
    };

    if (!user) return null;

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto relative">
            {/* Live Toast Notifications */}
            <div className="fixed top-8 right-8 z-50 flex flex-col gap-3">
                <AnimatePresence>
                    {notifications.map((n) => (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`glass-card p-4 border-l-4 ${n.type === 'warning' ? 'border-l-yellow-500' : 'border-l-primary'} flex items-start gap-4 shadow-2xl min-w-[300px]`}
                        >
                            <Bell className={n.type === 'warning' ? 'text-yellow-500' : 'text-primary'} />
                            <div>
                                <h4 className="font-bold text-sm">{n.title}</h4>
                                <p className="text-xs text-muted">{n.message}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Welcome back, {user?.name.split(' ')[0]}!</h1>
                    <p className="text-muted mt-2">Here's your productivity momentum for today.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/analytics" className="flex items-center gap-2 bg-foreground/5 border border-foreground/10 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-foreground/10 transition-all">
                        View Analytics
                    </Link>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Zap className="text-primary" size={24} />}
                    label="Productivity Score"
                    value={`${stats.score}%`}
                    trend={stats.score > 70 ? "Above average" : "Keep pushing!"}
                    color="primary"
                />
                <StatCard
                    icon={<Clock className="text-accent" size={24} />}
                    label="Total Focus Time"
                    value={`${Math.floor(stats.totalTime / 3600)}h ${Math.floor((stats.totalTime % 3600) / 60)}m`}
                    trend={`${Math.floor(stats.productiveTime / 60)}m productive`}
                    color="accent"
                />
                <StatCard
                    icon={<Target className="text-secondary" size={24} />}
                    label="Daily Streak"
                    value={`${stats.streak} Days`}
                    trend="Productive days in a row"
                    color="secondary"
                />
                <StatCard
                    icon={<Activity className="text-blue-400" size={24} />}
                    label="Peak Activity"
                    value={formatPeakHour(stats.peakHour)}
                    trend="Optimal focus period"
                    color="blue"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Real-time Tracking Summary */}
                <div className="lg:col-span-2 glass-card p-8 min-h-[400px]">
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <TrendingUp size={28} className="text-primary" />
                            Daily Momentum
                        </h2>
                        <Link href="/analytics" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                            Full Report <ArrowUpRight size={16} />
                        </Link>
                    </div>

                    <div className="space-y-6">
                        {loading ? (
                            <div className="h-[250px] flex items-center justify-center text-muted animate-pulse">
                                Analyzing your activity...
                            </div>
                        ) : stats.totalTime === 0 ? (
                            <div className="h-[250px] flex flex-col items-center justify-center text-center space-y-4">
                                <Search size={48} className="text-muted/20" />
                                <p className="text-muted italic max-w-xs">No activity tracked yet. Use the extension to see your progress here!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[250px] items-center">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold">Category Distribution</h3>
                                    <div className="flex h-4 w-full rounded-full overflow-hidden bg-foreground/5">
                                        <div className="bg-primary h-full" style={{ width: `${(stats.productiveTime / stats.totalTime) * 100}%` }} />
                                        <div className="bg-muted h-full" style={{ width: `${((stats.totalTime - stats.productiveTime) / stats.totalTime) * 100}%` }} />
                                    </div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                        <span className="text-primary">Productive</span>
                                        <span className="text-muted">Other</span>
                                    </div>
                                </div>
                                <div className="p-6 bg-foreground/[0.02] rounded-3xl border border-foreground/5">
                                    <h4 className="font-bold text-sm mb-2">Focus Insight</h4>
                                    <p className="text-xs text-muted leading-relaxed">
                                        {stats.peakHour ? `Your efficiency peaks around ${formatPeakHour(stats.peakHour).split('@')[1]}. Schedule your most difficult tasks for this block.` : "Keep tracking to unlock personalized focus insights."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    <div className="glass-card p-6 border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-center gap-2 mb-2 text-primary">
                            <Zap size={18} />
                            <h3 className="font-bold">Daily Tip</h3>
                        </div>
                        <p className="text-sm text-muted leading-relaxed">
                            {stats.score > 80 ? "You're in the elite flow zone! Take a 5-min break every hour to maintain this pace." : "Try using the Deep Work timer to build your focus endurance."}
                        </p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold flex items-center gap-2">
                                <Target size={18} className="text-secondary" />
                                Active Goals
                            </h3>
                            <button
                                onClick={() => setShowNewGoal(true)}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                            >
                                + Set New Goal
                            </button>
                        </div>
                        <div className="space-y-5">
                            {goals.length > 0 ? (
                                goals.slice(0, 3).map(goal => (
                                    <div key={goal._id} className="group relative">
                                        <GoalProgress
                                            label={goal.label || goal.website}
                                            current={goal.currentSeconds / 3600}
                                            total={goal.targetSeconds / 3600}
                                        />
                                        <div className="absolute top-0 right-0 flex items-center gap-2">
                                            <button
                                                onClick={() => openEditModal(goal)}
                                                className="p-1.5 text-muted hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Delete this goal?")) {
                                                        const token = localStorage.getItem("accessToken");
                                                        axios.delete(`${API_URL}/goals/${goal._id}`, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        }).then(() => {
                                                            setGoals(goals.filter(g => g._id !== goal._id));
                                                        });
                                                    }
                                                }}
                                                className="p-1.5 text-muted hover:text-accent transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <GoalProgress label="Deep Work" current={0} total={5} />
                                    <GoalProgress label="Focus Sessions" current={0} total={2} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
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
                                <h2 className="text-3xl font-bold font-outfit text-foreground">{editingGoal ? "Edit Goal" : "Set New Goal"}</h2>
                                <p className="text-sm text-muted font-inter mt-1">{editingGoal ? "Refine your productivity target." : "Define your target and start tracking."}</p>
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

function StatCard({ icon, label, value, trend, color }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`glass-card p-6 relative overflow-hidden group border-b-2 border-b-transparent hover:border-b-${color}`}
        >
            <div className="relative z-10">
                <div className="p-3 bg-foreground/5 w-fit rounded-xl mb-4 group-hover:bg-foreground/10 transition-all">
                    {icon}
                </div>
                <div className="text-muted text-xs font-bold uppercase tracking-widest mb-1">{label}</div>
                <div className="text-3xl font-extrabold mb-1">{value}</div>
                <div className="text-[10px] text-muted font-medium">{trend}</div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 bg-${color}/5 rounded-full blur-3xl group-hover:bg-${color}/10 transition-all`} />
        </motion.div>
    );
}

function GoalProgress({ label, current, total }) {
    const percent = Math.min(100, (current / total) * 100);
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold">
                <span className="text-muted uppercase tracking-tight">{label}</span>
                <span className="font-mono">{current}h / {total}h</span>
            </div>
            <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                />
            </div>
        </div>
    );
}
