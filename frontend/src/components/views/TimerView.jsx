"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Zap,
    Coffee,
    Play,
    Pause,
    RotateCcw,
    Plus,
    Check,
    Trash2,
    ListChecks,
    Target as TargetIcon,
    Save,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { trackingService } from "@/services/tracking.service";
import { requestExtensionWorkspaceToast } from "@/lib/extensionSync";
import { motion, AnimatePresence } from "framer-motion";

function formatHistoryType(type) {
    if (type === "short_break") return "Break";
    if (type === "long_break") return "Long break";
    return "Work";
}

/** Empty or invalid → dashboard defaults (25 / 5). */
function parseWorkMinutesInput(raw, fallback = 25) {
    const t = String(raw ?? "").trim();
    if (t === "") return fallback;
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(180, Math.max(1, n));
}

function parseBreakMinutesInput(raw, fallback = 5) {
    const t = String(raw ?? "").trim();
    if (t === "") return fallback;
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(60, Math.max(1, n));
}

export default function TimerView() {
    const { user, updatePreference, updatePreferences } = useAuth();
    const deepWorkMinutesPref = user?.preferences?.deepWorkMinutes;
    const breakMinutesPref = user?.preferences?.breakMinutes;
    const workMin = deepWorkMinutesPref ?? 25;
    const breakMin = breakMinutesPref ?? 5;

    const [workMinStr, setWorkMinStr] = useState(String(workMin));
    const [breakMinStr, setBreakMinStr] = useState(String(breakMin));
    const [timeLeft, setTimeLeft] = useState(workMin * 60);
    const [isActive, setIsActive] = useState(false);
    const [timerMode, setTimerMode] = useState("work");
    const [sessionHistory, setSessionHistory] = useState([]);
    const [focusIntention, setFocusIntention] = useState("");
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState("");
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savingDefaults, setSavingDefaults] = useState(false);

    const workMinInputRef = useRef(null);
    const breakMinInputRef = useRef(null);

    const workMinutes = parseWorkMinutesInput(workMinStr);
    const breakMinutes = parseBreakMinutesInput(breakMinStr);

    const phaseRef = useRef({
        workDuration: workMinutes,
        breakDuration: breakMinutes,
        timerMode,
        focusIntention,
        tasks,
    });

    useEffect(() => {
        phaseRef.current = {
            workDuration: workMinutes,
            breakDuration: breakMinutes,
            timerMode,
            focusIntention,
            tasks,
        };
    }, [workMinutes, breakMinutes, timerMode, focusIntention, tasks]);

    useEffect(() => {
        if (!user) return;
        const w = deepWorkMinutesPref ?? 25;
        const b = breakMinutesPref ?? 5;
        setWorkMinStr(String(w));
        setBreakMinStr(String(b));
        if (!isActive) {
            setTimeLeft(timerMode === "work" ? w * 60 : b * 60);
        }
    }, [user, deepWorkMinutesPref, breakMinutesPref, isActive, timerMode]);

    const synchronizeHistory = useCallback(async () => {
        try {
            const data = await trackingService.getDeepWorkHistory();
            setSessionHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Deep work history:", err);
        }
    }, []);

    useEffect(() => {
        if (user) synchronizeHistory();
    }, [user, synchronizeHistory]);

    const showToast = useCallback((message, variant = "success") => {
        setToast({ message, variant });
        window.setTimeout(() => setToast(null), 4200);
    }, []);

    const persistSession = useCallback(
        async (payload) => {
            setSaving(true);
            try {
                await trackingService.saveDeepWorkSession(payload);
                await synchronizeHistory();
            } catch (err) {
                console.error("Save deep work session:", err);
                showToast("Could not save session (offline?)", "error");
            } finally {
                setSaving(false);
            }
        },
        [synchronizeHistory, showToast]
    );

    const handlePhaseComplete = useCallback(() => {
        const {
            workDuration: wMin,
            breakDuration: bMin,
            timerMode: mode,
            focusIntention: intention,
            tasks: taskList,
        } = phaseRef.current;

        if (mode === "work") {
            void persistSession({
                type: "work",
                durationMinutes: wMin,
                actualMinutes: wMin,
                completed: true,
                task: intention.trim(),
                subtasks: taskList.map((t) => ({ text: t.text, completed: t.completed })),
            });
            showToast(`Focus block complete — ${wMin} min saved. Time for a break.`);
            requestExtensionWorkspaceToast({
                title: "Deep work complete",
                message: `${wMin} min focus saved.${intention.trim() ? ` “${intention.trim()}”` : ""} Time for a short break.`,
                systemNotify: true,
            });
            setTimerMode("break");
            setTimeLeft(bMin * 60);
        } else {
            void persistSession({
                type: "short_break",
                durationMinutes: bMin,
                actualMinutes: bMin,
                completed: true,
                task: "",
                subtasks: [],
            });
            showToast(`Break done — ready for another ${wMin} min focus stretch.`);
            requestExtensionWorkspaceToast({
                title: "Break complete",
                message: `Ready for another ${wMin} minute focus stretch.`,
                systemNotify: true,
            });
            setTimerMode("work");
            setTimeLeft(wMin * 60);
        }
    }, [persistSession, showToast]);

    useEffect(() => {
        if (!isActive) return undefined;
        const id = window.setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    setIsActive(false);
                    window.queueMicrotask(() => handlePhaseComplete());
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => window.clearInterval(id);
    }, [isActive, handlePhaseComplete]);

    const totalSeconds = timerMode === "work" ? workMinutes * 60 : breakMinutes * 60;
    const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(timerMode === "work" ? workMinutes * 60 : breakMinutes * 60);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const commitNewTask = useCallback(() => {
        const text = newTask.trim();
        if (!text) return;
        setTasks((prev) => [...prev, { id: Date.now(), text, completed: false }]);
        setNewTask("");
    }, [newTask]);

    const addTask = (e) => {
        e.preventDefault();
        e.stopPropagation();
        commitNewTask();
    };

    const toggleTask = (id) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    };

    const deleteTask = (id) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    const saveTimerDefaults = useCallback(async () => {
        if (!updatePreferences || savingDefaults || isActive) return;
        // Read from inputs so Save works even if focus moves before React state flushes.
        const wRaw = workMinInputRef.current?.value ?? workMinStr;
        const bRaw = breakMinInputRef.current?.value ?? breakMinStr;
        const w = parseWorkMinutesInput(wRaw);
        const b = parseBreakMinutesInput(bRaw);
        setWorkMinStr(String(w));
        setBreakMinStr(String(b));
        setSavingDefaults(true);
        const ok = await updatePreferences({
            deepWorkMinutes: w,
            breakMinutes: b,
        });
        if (ok) {
            showToast("Defaults saved — they load next time and sync to the extension.");
            if (!isActive) {
                setTimeLeft(timerMode === "work" ? w * 60 : b * 60);
            }
        } else {
            showToast("Could not save defaults. Check your connection.", "error");
        }
        setSavingDefaults(false);
    }, [
        updatePreferences,
        savingDefaults,
        isActive,
        workMinStr,
        breakMinStr,
        timerMode,
        showToast,
    ]);

    if (!user) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 relative">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl text-sm font-bold shadow-xl border max-w-md text-center ${
                            toast.variant === "error"
                                ? "bg-red-500/20 border-red-500/40 text-red-200"
                                : "bg-primary/20 border-primary/40 text-foreground"
                        }`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Deep Work</h1>
                    <p className="text-muted text-sm">Pomodoro-style focus and breaks. Completed rounds are saved to Past Sessions.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 flex-1 lg:max-w-2xl lg:justify-end lg:items-end">
                    <div className="relative flex-1 min-w-[200px]">
                        <TargetIcon
                            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-[18px] -translate-y-1/2 text-primary"
                            aria-hidden
                        />
                        <input
                            type="text"
                            placeholder="What's your focus for this session?"
                            value={focusIntention}
                            onChange={(e) => setFocusIntention(e.target.value)}
                            disabled={isActive && timerMode === "work"}
                            className="min-h-[46px] w-full rounded-2xl border-2 border-ui bg-foreground/5 py-2.5 pl-11 pr-4 text-sm font-medium leading-snug transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        />
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="timer-work-min" className="text-[9px] font-black uppercase tracking-wider text-muted">
                                    Work (min)
                                </label>
                                <input
                                    ref={workMinInputRef}
                                    id="timer-work-min"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="off"
                                    disabled={isActive}
                                    className="h-10 w-[4.25rem] rounded-xl border-2 border-ui bg-foreground/5 px-2 text-center text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                    value={workMinStr}
                                    onChange={(e) => setWorkMinStr(e.target.value.replace(/\D/g, ""))}
                                    onBlur={async (e) => {
                                        const v = parseWorkMinutesInput(e.target.value);
                                        setWorkMinStr(String(v));
                                        await updatePreference("deepWorkMinutes", v);
                                        if (!isActive && timerMode === "work") setTimeLeft(v * 60);
                                    }}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="timer-break-min" className="text-[9px] font-black uppercase tracking-wider text-muted">
                                    Break (min)
                                </label>
                                <input
                                    ref={breakMinInputRef}
                                    id="timer-break-min"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="off"
                                    disabled={isActive}
                                    className="h-10 w-[4.25rem] rounded-xl border-2 border-ui bg-foreground/5 px-2 text-center text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                                    value={breakMinStr}
                                    onChange={(e) => setBreakMinStr(e.target.value.replace(/\D/g, ""))}
                                    onBlur={async (e) => {
                                        const v = parseBreakMinutesInput(e.target.value);
                                        setBreakMinStr(String(v));
                                        await updatePreference("breakMinutes", v);
                                        if (!isActive && timerMode === "break") setTimeLeft(v * 60);
                                    }}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-transparent select-none" aria-hidden>
                                    &nbsp;
                                </span>
                                <button
                                    type="button"
                                    disabled={isActive || savingDefaults}
                                    onClick={() => void saveTimerDefaults()}
                                    className="btn-secondary inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-xs font-bold disabled:opacity-50"
                                >
                                    <Save size={16} className="shrink-0 opacity-90" />
                                    {savingDefaults ? "Saving…" : "Save defaults"}
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted max-w-xs sm:text-right leading-snug">
                            Default is 25 / 5 minutes. Save keeps work &amp; break length for next visit and the Chrome extension.
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 relative z-0 flex flex-col items-center justify-center space-y-10 py-10 glass-card overflow-hidden">
                    <div className="relative z-0 flex h-[320px] w-full max-w-[320px] items-center justify-center">
                    <div className="relative h-72 w-72 shrink-0 scale-100 sm:scale-105">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 288 288">
                            <circle
                                cx="144"
                                cy="144"
                                r="130"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-foreground/5"
                            />
                            <circle
                                cx="144"
                                cy="144"
                                r="130"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 130}
                                strokeDashoffset={(2 * Math.PI * 130 * (100 - progress)) / 100}
                                strokeLinecap="round"
                                className={timerMode === "work" ? "text-primary" : "text-secondary"}
                                style={{ transition: "stroke-dashoffset 0.35s linear" }}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                {timerMode === "work" ? (
                                    <Zap size={14} className="text-primary" />
                                ) : (
                                    <Coffee size={14} className="text-secondary" />
                                )}
                                {timerMode === "work" ? "work" : "break"}
                            </span>
                            <span className="text-7xl font-mono font-black tabular-nums">{formatTime(timeLeft)}</span>
                            {saving && <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Saving…</span>}
                        </div>
                    </div>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            type="button"
                            onClick={() => setIsActive((a) => !a)}
                            className={`px-12 py-4 text-base ${
                                isActive ? "btn-secondary" : "btn-primary"
                            }`}
                        >
                            {isActive ? <Pause size={20} /> : <Play size={20} />}
                            {isActive ? "Pause" : timerMode === "work" ? "Start focus" : "Start break"}
                        </button>
                        <button
                            type="button"
                            onClick={resetTimer}
                            className="btn-icon p-4 text-foreground"
                            title="Reset current phase"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>
                    <p className="text-[10px] text-muted text-center max-w-sm">
                        Finish a full work or break round to save it under Past Sessions. Pause anytime with the button.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col space-y-6">
                    <div className="glass-card pointer-events-auto p-6 min-h-[400px] flex flex-col">
                        <div className="mb-6 flex items-center gap-2 border-b-ui-muted pb-4">
                            <ListChecks className="text-primary" size={18} />
                            <h2 className="text-sm font-black uppercase tracking-widest">Session tasks</h2>
                        </div>

                        <form
                            onSubmit={addTask}
                            className="flex gap-2 mb-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="text"
                                placeholder="Add a subtask..."
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                autoComplete="off"
                                className="flex-1 bg-foreground/5 border-2 border-ui rounded-xl py-2 px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25"
                            />
                            <button type="submit" aria-label="Add subtask" className="btn-icon-primary btn-icon-sm shrink-0">
                                <Plus size={18} strokeWidth={2.5} />
                            </button>
                        </form>

                        <div className="flex-1 space-y-3 overflow-auto max-h-[300px] pr-2 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {tasks.length === 0 ? (
                                    <p className="text-center text-muted text-xs py-10 italic">
                                        Break your focus goal into small tasks (saved with each work session).
                                    </p>
                                ) : (
                                    tasks.map((task) => (
                                        <motion.div
                                            key={task.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="group flex items-center gap-3 rounded-xl border-2 border-ui-muted bg-foreground/[0.02] p-3"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleTask(task.id)}
                                                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                                                    task.completed
                                                        ? "border-primary bg-primary text-white"
                                                        : "border-ui"
                                                }`}
                                            >
                                                {task.completed && <Check size={12} />}
                                            </button>
                                            <span
                                                className={`flex-1 text-sm ${
                                                    task.completed ? "line-through text-muted" : "text-foreground"
                                                }`}
                                            >
                                                {task.text}
                                            </span>
                                            <button
                                                type="button"
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
                        <h2 className="text-[10px] font-black uppercase text-muted tracking-widest mb-4">Past sessions</h2>
                        <div className="space-y-4 max-h-[240px] overflow-auto pr-2 custom-scrollbar">
                            {sessionHistory.length === 0 ? (
                                <p className="text-xs text-muted italic py-6 text-center">Complete a work or break round to see history.</p>
                            ) : (
                                sessionHistory.slice(0, 12).map((session) => (
                                    <div
                                        key={session._id}
                                        className="flex items-start justify-between gap-3 rounded-xl border-2 border-ui-muted bg-foreground/[0.01] p-3"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div
                                                className={`p-2 rounded-lg shrink-0 ${
                                                    session.type === "work"
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-secondary/10 text-secondary"
                                                }`}
                                            >
                                                {session.type === "work" ? <Zap size={14} /> : <Coffee size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs capitalize">{formatHistoryType(session.type)}</p>
                                                <p className="text-[9px] text-muted">
                                                    {session.startedAt
                                                        ? new Date(session.startedAt).toLocaleString()
                                                        : "—"}
                                                </p>
                                                {session.task ? (
                                                    <p className="text-[10px] text-foreground/80 mt-1 truncate" title={session.task}>
                                                        {session.task}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono font-black text-muted shrink-0">
                                            {session.actualMinutes ?? session.durationMinutes}m
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--scrollbar-thumb);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
