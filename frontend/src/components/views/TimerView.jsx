"use client";
import { useState, useEffect } from "react";
import { Zap, Coffee, Play, Pause, RotateCcw, Plus, Check, Trash2, ListChecks, Target as TargetIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { trackingService } from "@/services/tracking.service";
import { motion, AnimatePresence } from "framer-motion";

export default function TimerView() {
    const { user } = useAuth();
    const [workDuration, setWorkDuration] = useState(user?.preferences?.deepWorkMinutes || 25);
    const [breakDuration, setBreakDuration] = useState(user?.preferences?.breakMinutes || 5);
    const [timeLeft, setTimeLeft] = useState(workDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [timerMode, setTimerMode] = useState("work");
    const [sessionHistory, setSessionHistory] = useState([]);

    // New Productivity Features
    const [focusIntention, setFocusIntention] = useState("");
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState("");

    const totalSeconds = timerMode === "work" ? workDuration * 60 : breakDuration * 60;
    const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

    useEffect(() => {
        if (user?.preferences) {
            const currentWork = user.preferences.deepWorkMinutes || 25;
            const currentBreak = user.preferences.breakMinutes || 5;
            setWorkDuration(currentWork);
            setBreakDuration(currentBreak);
            if (!isActive) setTimeLeft(timerMode === "work" ? currentWork * 60 : currentBreak * 60);
        }
    }, [user?.preferences, isActive, timerMode]);

    useEffect(() => {
        let timer;
        if (isActive && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (timerMode === "work") {
                alert("Focus session finished!");
                setTimerMode("break");
                setTimeLeft(breakDuration * 60);
            } else {
                alert("Break finished!");
                setTimerMode("work");
                setTimeLeft(workDuration * 60);
            }
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft, timerMode, workDuration, breakDuration]);

    useEffect(() => {
        if (user) synchronizeHistory();
    }, [user]);

    async function synchronizeHistory() {
        try {
            const data = await trackingService.getDeepWorkHistory();
            setSessionHistory(data);
        } catch (err) {
            console.error("error fetching session history:", err);
        }
    }

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(timerMode === "work" ? workDuration * 60 : breakDuration * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const addTask = (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
        setNewTask("");
    };

    const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Deep Work</h1>
                    <p className="text-muted text-sm">Eliminate distractions and enter the zone.</p>
                </div>
                <div className="flex-1 max-w-md">
                    <div className="relative group">
                        <TargetIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                        <input
                            type="text"
                            placeholder="What's your focus for this session?"
                            value={focusIntention}
                            onChange={(e) => setFocusIntention(e.target.value)}
                            className="w-full bg-foreground/5 border border-foreground/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Timer Section */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-10 py-10 glass-card">
                    <div className="relative w-72 h-72 scale-110">
                        {/* Progress Ring */}
                        <svg className="w-full h-full -rotate-90 transform">
                            <circle
                                cx="144"
                                cy="144"
                                r="130"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-foreground/5"
                            />
                            <motion.circle
                                cx="144"
                                cy="144"
                                r="130"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={816}
                                initial={{ strokeDashoffset: 816 }}
                                animate={{ strokeDashoffset: 816 - (816 * progress) / 100 }}
                                className={timerMode === 'work' ? 'text-primary' : 'text-secondary'}
                                transition={{ duration: 0.5, ease: "linear" }}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                {timerMode === 'work' ? <Zap size={14} className="text-primary" /> : <Coffee size={14} className="text-secondary" />}
                                {timerMode}
                            </span>
                            <span className="text-7xl font-mono font-black">{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-foreground/5 text-foreground border border-foreground/10' : 'bg-primary text-background shadow-lg shadow-primary/30'}`}
                        >
                            {isActive ? <Pause size={20} /> : <Play size={20} />}
                            {isActive ? 'Pause' : 'Start Focus'}
                        </button>
                        <button
                            onClick={resetTimer}
                            className="p-4 bg-foreground/5 border border-foreground/10 rounded-2xl text-muted hover:text-foreground transition-all hover:scale-110"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                </div>

                {/* Task Section */}
                <div className="flex flex-col space-y-6">
                    <div className="glass-card p-6 min-h-[400px] flex flex-col">
                        <div className="flex items-center gap-2 mb-6 border-b border-foreground/5 pb-4">
                            <ListChecks className="text-primary" size={18} />
                            <h2 className="text-sm font-black uppercase tracking-widest">Session Tasks</h2>
                        </div>

                        <form onSubmit={addTask} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="Add a subtask..."
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                className="flex-1 bg-foreground/5 border border-foreground/10 rounded-xl py-2 px-4 text-sm focus:outline-none"
                            />
                            <button type="submit" className="p-2 bg-primary text-background rounded-xl hover:opacity-90">
                                <Plus size={18} />
                            </button>
                        </form>

                        <div className="flex-1 space-y-3 overflow-auto max-h-[300px] pr-2 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {tasks.length === 0 ? (
                                    <p className="text-center text-muted text-xs py-10 italic">Break down your focus goal into small tasks.</p>
                                ) : (
                                    tasks.map(task => (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5 group"
                                        >
                                            <button
                                                onClick={() => toggleTask(task.id)}
                                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${task.completed ? 'bg-primary border-primary text-background' : 'border-foreground/20'}`}
                                            >
                                                {task.completed && <Check size={12} />}
                                            </button>
                                            <span className={`flex-1 text-sm ${task.completed ? 'line-through text-muted' : 'text-foreground'}`}>
                                                {task.text}
                                            </span>
                                            <button
                                                onClick={() => deleteTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-500 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h2 className="text-[10px] font-black uppercase text-muted tracking-widest mb-4">Past Sessions</h2>
                        <div className="space-y-4 max-h-[200px] overflow-auto pr-2 custom-scrollbar">
                            {sessionHistory.slice(0, 5).map(session => (
                                <div key={session._id} className="flex justify-between items-center bg-foreground/[0.01] p-3 rounded-xl border border-foreground/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${session.type === 'work' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                            {session.type === 'work' ? <Zap size={14} /> : <Coffee size={14} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs capitalize">{session.type}</p>
                                            <p className="text-[9px] text-muted">{new Date(session.startedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-muted">{session.durationMinutes}m</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.01);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 32px;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}
