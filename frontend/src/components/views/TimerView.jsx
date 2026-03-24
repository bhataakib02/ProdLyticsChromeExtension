"use client";

import { useState, useEffect } from "react";
import { Zap, Coffee, Play, Pause, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { trackingService } from "@/services/tracking.service";

export default function TimerView() {
    const { user, checkUser } = useAuth();
    const [workDuration, setWorkDuration] = useState(user?.preferences?.deepWorkMinutes || 25);
    const [breakDuration, setBreakDuration] = useState(user?.preferences?.breakMinutes || 5);
    const [timeLeft, setTimeLeft] = useState(workDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [timerMode, setTimerMode] = useState("work");
    const [sessionHistory, setSessionHistory] = useState([]);
    const [configVisible, setConfigVisible] = useState(false);

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
        if (isActive && timeLeft > 0) timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
        else if (timeLeft === 0) {
            setIsActive(false);
            if (timerMode === "work") { alert("Focus session finished!"); setTimerMode("break"); setTimeLeft(breakDuration * 60); }
            else { alert("Break finished!"); setTimerMode("work"); setTimeLeft(workDuration * 60); }
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft, timerMode, workDuration, breakDuration]);

    useEffect(() => { if (user) synchronizeHistory(); }, [user]);

    async function synchronizeHistory() {
        try {
            const data = await trackingService.getDeepWorkHistory();
            setSessionHistory(data);
        } catch (err) { console.error("error fetching session history:", err); }
    }

    const resetTimer = () => { setIsActive(false); setTimeLeft(timerMode === "work" ? workDuration * 60 : breakDuration * 60); };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    if (!user) return null;

    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] space-y-12 max-w-7xl mx-auto">
            <div className="text-center">
                <h1 className="text-5xl font-bold tracking-tighter mb-3">Deep Work</h1>
                <p className="text-muted text-sm mx-auto max-w-md">Master your focus with optimized work-break cycles.</p>
            </div>

            <div className="relative">
                <div className={`absolute inset-0 bg-${timerMode === 'work' ? 'primary' : 'secondary'}/20 rounded-full blur-[80px] transition-all duration-700`} />
                <div className="relative w-80 h-80 glass-card rounded-full border-4 border-foreground/5 flex flex-col items-center justify-center shadow-2xl">
                    <div className="flex items-center gap-2 text-muted uppercase text-xs font-black mb-2">
                        {timerMode === 'work' ? <Zap size={14} className="text-primary" /> : <Coffee size={14} className="text-secondary" />}
                        {timerMode === 'work' ? 'Focus' : 'Break'}
                    </div>
                    <div className="text-7xl font-black font-mono">{formatTime(timeLeft)}</div>
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={() => setIsActive(!isActive)} className={`flex items-center gap-2 px-10 py-5 rounded-3xl font-bold transition-all ${isActive ? 'bg-white/10 text-white' : 'bg-primary text-background'}`}>
                    {isActive ? <Pause size={24} /> : <Play size={24} />} {isActive ? 'Pause' : 'Start Focus'}
                </button>
                <button onClick={resetTimer} className="p-5 bg-white/5 border border-white/10 rounded-3xl text-muted hover:text-white transition-all"><RotateCcw size={24} /></button>
            </div>

            <div className="w-full max-w-2xl space-y-6 pb-20">
                <h2 className="text-[10px] font-black uppercase text-muted tracking-widest border-b border-white/5 pb-4">Recent Sessions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessionHistory.map(session => (
                        <div key={session._id} className="glass-card p-6 flex justify-between items-center bg-white/[0.01]">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${session.type === 'work' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                                    {session.type === 'work' ? <Zap size={16} /> : <Coffee size={16} />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm capitalize">{session.type}</p>
                                    <p className="text-[9px] text-muted uppercase font-black">{new Date(session.startedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black uppercase text-muted">{session.durationMinutes}m</span>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx global>{`
                .glass-card { background: rgba(255, 255, 255, 0.015); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 48px; }
            `}</style>
        </div>
    );
}
