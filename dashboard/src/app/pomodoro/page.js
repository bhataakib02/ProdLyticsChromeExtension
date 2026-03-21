"use client";

import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/context/AuthContext";
import {
    Timer,
    Coffee,
    Play,
    Pause,
    RotateCcw,
    Zap,
    Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

export default function DeepWorkPage() {
    const { user, checkUser } = useAuth();
    const [workDuration, setWorkDuration] = useState(user?.preferences?.deepWorkMinutes || 25);
    const [breakDuration, setBreakDuration] = useState(user?.preferences?.breakMinutes || 5);
    const [timeLeft, setTimeLeft] = useState(workDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState("work"); // work | break
    const [history, setHistory] = useState([]);
    const [showSettings, setShowSettings] = useState(false);

    // Sync with user preferences when they change
    useEffect(() => {
        if (user?.preferences) {
            const prefWork = user.preferences.deepWorkMinutes || 25;
            const prefBreak = user.preferences.breakMinutes || 5;
            setWorkDuration(prefWork);
            setBreakDuration(prefBreak);

            // Only update timeLeft if timer isn't running
            if (!isActive) {
                setTimeLeft(mode === "work" ? prefWork * 60 : prefBreak * 60);
            }
        }
    }, [user?.preferences?.deepWorkMinutes, user?.preferences?.breakMinutes, isActive, mode]);

    useEffect(() => {
        let interval;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (mode === "work") {
                alert("Deep Work session finished! Excellent work.");
                setMode("break");
                setTimeLeft(breakDuration * 60);
            } else {
                alert("Break finished! Resuming Deep Work.");
                setMode("work");
                setTimeLeft(workDuration * 60);
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, workDuration, breakDuration]);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user]);

    async function fetchHistory() {
        try {
            const token = localStorage.getItem("accessToken");
            const res = await axios.get(`${API_URL}/deepwork/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            console.error("❌ Error fetching sessions history:", err.response?.data || err.message);
        }
    }

    const toggleTimer = () => {
        const newActive = !isActive;
        setIsActive(newActive);
        if (newActive) {
            syncWithExtension(timeLeft / 60);
        }
    };

    const syncWithExtension = (minutes) => {
        const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";
        if (typeof window !== "undefined" && window.chrome && window.chrome.runtime) {
            window.chrome.runtime.sendMessage(extensionId, {
                action: "startDeepWork",
                minutes: Math.ceil(minutes)
            }, (response) => {
                if (window.chrome.runtime.lastError) {
                    console.warn("❌ Could not sync Deep Work:", window.chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Deep Work synced to extension");
                    // Refresh history after a short delay to see the new entry
                    setTimeout(fetchHistory, 2000);
                }
            });
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
    };

    const saveSettings = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.put(`${API_URL}/auth/preferences`, {
                deepWorkMinutes: workDuration,
                breakMinutes: breakDuration
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await checkUser();
            setShowSettings(false);
            if (!isActive) {
                resetTimer();
            }
        } catch (err) {
            console.error("Error saving timer settings");
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    if (!user) return null;

    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] space-y-12 max-w-7xl mx-auto">
            <div className="text-center">
                <h1 className="text-5xl font-bold font-outfit tracking-tighter mb-3">Deep Work</h1>
                <p className="text-muted font-inter text-sm max-w-md mx-auto">Master your focus with optimized work-break cycles and neural tracking.</p>
            </div>

            <div className="relative">
                <div className={`absolute inset-0 bg-${mode === 'work' ? 'primary' : 'secondary'}/20 rounded-full blur-[80px] transition-all duration-700`} />
                <div className="relative w-80 h-80 glass-card rounded-full border-4 border-foreground/5 flex flex-col items-center justify-center shadow-2xl">
                    <div className="flex items-center gap-2 text-muted uppercase text-xs tracking-widest font-bold mb-2">
                        {mode === 'work' ? <Zap size={14} className="text-primary" /> : <Coffee size={14} className="text-secondary" />}
                        {mode === 'work' ? 'Deep Work' : 'Short Break'}
                    </div>
                    <div className="text-7xl font-black font-mono">
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={toggleTimer}
                    className={`flex items-center gap-2 px-10 py-5 rounded-3xl font-bold transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-foreground/10 text-foreground' : 'bg-primary text-background'}`}
                >
                    {isActive ? <Pause size={24} /> : <Play size={24} />}
                    {isActive ? 'Pause' : 'Start Focus'}
                </button>
                <button
                    onClick={resetTimer}
                    className="p-5 bg-foreground/5 border border-foreground/10 rounded-3xl hover:bg-foreground/10 transition-all text-muted hover:text-foreground"
                >
                    <RotateCcw size={24} />
                </button>
            </div>

            <div className="flex gap-2 p-1 bg-foreground/5 rounded-2xl border border-foreground/10">
                <button
                    onClick={() => { setMode("work"); setTimeLeft(workDuration * 60); setIsActive(false); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'work' ? 'bg-foreground/10 text-foreground shadow-lg' : 'text-muted hover:text-foreground'}`}
                >
                    Focus
                </button>
                <button
                    onClick={() => { setMode("break"); setTimeLeft(breakDuration * 60); setIsActive(false); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'break' ? 'bg-foreground/10 text-foreground shadow-lg' : 'text-muted hover:text-foreground'}`}
                >
                    Break
                </button>
            </div>

            <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs font-bold text-muted hover:text-primary transition-colors flex items-center gap-2"
            >
                <Settings size={14} /> {showSettings ? 'Hide Session Settings' : 'Customize Session Length'}
            </button>

            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="glass-card p-6 w-full max-w-sm overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest">Focus Time</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={workDuration}
                                        onChange={(e) => setWorkDuration(parseInt(e.target.value) || 0)}
                                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-muted font-bold">MIN</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest">Break Time</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={breakDuration}
                                        onChange={(e) => setBreakDuration(parseInt(e.target.value) || 0)}
                                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-muted font-bold">MIN</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={saveSettings}
                            className="w-full mt-6 bg-primary text-background font-bold py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            Update Session Target
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Session History */}
            <div className="w-full max-w-2xl mt-16 space-y-6 pb-20">
                <h2 className="text-[10px] font-black uppercase text-muted tracking-[0.2em] flex items-center gap-3 border-b border-foreground/5 pb-4">
                    <Timer size={16} className="text-primary" /> Recent Focus Sessions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.length === 0 ? (
                        <p className="col-span-full text-center text-muted italic text-sm py-8 font-inter">No recent sessions found.</p>
                    ) : (
                        history.map((session) => (
                            <div key={session._id} className="glass-card p-6 flex justify-between items-center group hover:border-primary/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${session.type === 'work' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                        {session.type === 'work' ? <Zap size={16} /> : <Coffee size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-bold font-outfit capitalize text-sm">{session.type} Block</p>
                                        <div className="flex items-center gap-2 text-[9px] text-muted font-black uppercase tracking-tighter">
                                            <span>{new Date(session.startedAt).toLocaleDateString()}</span>
                                            <span className="opacity-30">•</span>
                                            <span>{session.durationMinutes}m Goal</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${session.completed ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-foreground/5 text-muted'}`}>
                                    {session.completed ? 'Achieved' : 'Idle'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
