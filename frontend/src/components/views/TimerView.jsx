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
    Volume2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { trackingService } from "@/services/tracking.service";
import { requestExtensionWorkspaceToast } from "@/lib/extensionSync";
import { TimerAlertsOnboarding } from "@/components/pwa/TimerAlertsOnboarding";
import {
    DEEP_WORK_TIMER_STORAGE_KEY,
    dispatchDeepWorkTimerSync,
} from "@/lib/deepWorkTimerStorage";
import { SESSION_REFLECTIONS_KEY, dispatchReflectionsUpdated } from "@/lib/sessionReflections";
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

function formatTimeForTitle(seconds) {
    const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function showBrowserNotification(title, body) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
        new Notification(title, { body });
    } catch {
        /* ignore */
    }
}

async function requestNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    try {
        await Notification.requestPermission();
    } catch {
        /* ignore */
    }
}

function playPhaseEndChime() {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try {
        const ctx = new AC();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.value = 0.07;
        [523.25, 659.25].forEach((freq, i) => {
            const o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = freq;
            o.connect(gain);
            const t = ctx.currentTime + i * 0.12;
            o.start(t);
            o.stop(t + 0.11);
        });
        void ctx.resume?.();
    } catch {
        /* ignore */
    }
}

function normalizeTasksFromStorage(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((t) => t && typeof t.text === "string")
        .slice(0, 30)
        .map((t, i) => ({
            id: typeof t.id === "number" && Number.isFinite(t.id) ? t.id : Date.now() + i,
            text: String(t.text).slice(0, 300),
            completed: !!t.completed,
        }));
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
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [storageReady, setStorageReady] = useState(false);
    const [reflectionOpen, setReflectionOpen] = useState(false);
    const [reflectionDraft, setReflectionDraft] = useState("");

    const workMinInputRef = useRef(null);
    const breakMinInputRef = useRef(null);
    const timeLeftRef = useRef(timeLeft);
    const isActiveRef = useRef(isActive);
    const phaseEndTimeRef = useRef(0);
    const phaseTransitionLockRef = useRef(false);
    const baseDocumentTitleRef = useRef("");
    const timerHydratedForUserRef = useRef(null);

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
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        isActiveRef.current = isActive;
    }, [isActive]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        baseDocumentTitleRef.current = document.title;
        return () => {
            if (baseDocumentTitleRef.current) {
                document.title = baseDocumentTitleRef.current;
            }
        };
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const base = baseDocumentTitleRef.current || "ProdLytics";
        if (isActive) {
            const label = timerMode === "work" ? "Focus" : "Break";
            document.title = `${formatTimeForTitle(timeLeft)} · ${label} — ${base}`;
        } else {
            document.title = base;
        }
    }, [isActive, timeLeft, timerMode]);

    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (isActiveRef.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, []);

    useEffect(() => {
        if (!user) return;
        const w = deepWorkMinutesPref ?? 25;
        const b = breakMinutesPref ?? 5;
        setWorkMinStr(String(w));
        setBreakMinStr(String(b));
    }, [user, deepWorkMinutesPref, breakMinutesPref]);

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
                const saved = await trackingService.saveDeepWorkSession(payload);
                if (saved && saved._id) {
                    setSessionHistory((prev) => {
                        const rest = prev.filter((x) => x._id !== saved._id);
                        return [saved, ...rest].slice(0, 20);
                    });
                } else {
                    await synchronizeHistory();
                }
            } catch (err) {
                console.error("Save deep work session:", err);
                showToast("Could not save session (offline?)", "error");
            } finally {
                setSaving(false);
            }
        },
        [synchronizeHistory, showToast]
    );

    const recoverOverdueFromSnapshot = useCallback(
        (s) => {
            const wMin = parseWorkMinutesInput(s.workMinStr, 25);
            const bMin = parseBreakMinutesInput(s.breakMinStr, 5);
            const mode = s.timerMode === "break" ? "break" : "work";
            const intention = typeof s.focusIntention === "string" ? s.focusIntention : "";
            const taskList = normalizeTasksFromStorage(s.tasks).map((t) => ({
                text: t.text,
                completed: t.completed,
            }));

            if (mode === "work") {
                const extMsg = `${wMin} min focus saved.${intention.trim() ? ` “${intention.trim()}”` : ""} Time for a short break.`;
                void persistSession({
                    type: "work",
                    durationMinutes: wMin,
                    actualMinutes: wMin,
                    completed: true,
                    task: intention.trim(),
                    subtasks: taskList,
                });
                showToast(`Focus block complete — ${wMin} min saved. Time for a break.`);
                if (s.soundEnabled) playPhaseEndChime();
                showBrowserNotification("Deep work complete", extMsg);
                requestExtensionWorkspaceToast({
                    title: "Deep work complete",
                    message: extMsg,
                    systemNotify: true,
                });
                setTimerMode("break");
                setTimeLeft(bMin * 60);
            } else {
                const extMsg = `Ready for another ${wMin} minute focus stretch.`;
                void persistSession({
                    type: "short_break",
                    durationMinutes: bMin,
                    actualMinutes: bMin,
                    completed: true,
                    task: "",
                    subtasks: [],
                });
                showToast(`Break done — ready for another ${wMin} min focus stretch.`);
                if (s.soundEnabled) playPhaseEndChime();
                showBrowserNotification("Break complete", extMsg);
                requestExtensionWorkspaceToast({
                    title: "Break complete",
                    message: extMsg,
                    systemNotify: true,
                });
                setTimerMode("work");
                setTimeLeft(wMin * 60);
            }
        },
        [persistSession, showToast]
    );

    useEffect(() => {
        if (!user?.id) {
            timerHydratedForUserRef.current = null;
            setStorageReady(false);
            return;
        }
        if (timerHydratedForUserRef.current === user.id) {
            setStorageReady(true);
            return;
        }
        timerHydratedForUserRef.current = user.id;

        const wPref = deepWorkMinutesPref ?? 25;
        const bPref = breakMinutesPref ?? 5;

        try {
            const raw = localStorage.getItem(DEEP_WORK_TIMER_STORAGE_KEY);
            if (raw) {
                const s = JSON.parse(raw);
                if (s.v === 1 && s.userId === user.id) {
                    const tasksNorm = normalizeTasksFromStorage(s.tasks);
                    const focus = typeof s.focusIntention === "string" ? s.focusIntention : "";
                    const wm = String(s.workMinStr ?? wPref);
                    const bm = String(s.breakMinStr ?? bPref);
                    const mode = s.timerMode === "break" ? "break" : "work";
                    if (typeof s.soundEnabled === "boolean") setSoundEnabled(s.soundEnabled);

                    if (s.isActive && typeof s.phaseEndsAt === "number") {
                        const remaining = Math.max(0, Math.ceil((s.phaseEndsAt - Date.now()) / 1000));
                        setFocusIntention(focus);
                        setTasks(tasksNorm);
                        setWorkMinStr(wm);
                        setBreakMinStr(bm);
                        setTimerMode(mode);
                        if (remaining > 0) {
                            phaseEndTimeRef.current = s.phaseEndsAt;
                            setTimeLeft(remaining);
                            setIsActive(true);
                            setStorageReady(true);
                            return;
                        }
                        setTimeLeft(0);
                        setIsActive(false);
                        phaseEndTimeRef.current = 0;
                        window.queueMicrotask(() => recoverOverdueFromSnapshot(s));
                        setStorageReady(true);
                        return;
                    }

                    setFocusIntention(focus);
                    setTasks(tasksNorm);
                    setWorkMinStr(wm);
                    setBreakMinStr(bm);
                    setTimerMode(mode);
                    const fallbackFull =
                        mode === "work" ? parseWorkMinutesInput(wm, wPref) * 60 : parseBreakMinutesInput(bm, bPref) * 60;
                    const tl =
                        typeof s.timeLeft === "number" && Number.isFinite(s.timeLeft)
                            ? Math.max(0, s.timeLeft)
                            : fallbackFull;
                    setTimeLeft(tl);
                    setIsActive(false);
                    phaseEndTimeRef.current = 0;
                    setStorageReady(true);
                    return;
                }
            }
        } catch {
            /* ignore corrupt storage */
        }

        setWorkMinStr(String(wPref));
        setBreakMinStr(String(bPref));
        setTimerMode("work");
        setTimeLeft(wPref * 60);
        setFocusIntention("");
        setTasks([]);
        setStorageReady(true);
    }, [user?.id, deepWorkMinutesPref, breakMinutesPref, recoverOverdueFromSnapshot]);

    useEffect(() => {
        if (typeof window === "undefined" || !storageReady || !user?.id) return;
        const payload = {
            v: 1,
            userId: user.id,
            timerMode,
            isActive,
            phaseEndsAt: isActive ? phaseEndTimeRef.current : null,
            timeLeft,
            focusIntention,
            tasks: tasks.map((t) => ({ id: t.id, text: t.text, completed: t.completed })),
            workMinStr,
            breakMinStr,
            soundEnabled,
        };
        try {
            localStorage.setItem(DEEP_WORK_TIMER_STORAGE_KEY, JSON.stringify(payload));
            dispatchDeepWorkTimerSync();
        } catch {
            /* ignore quota / private mode */
        }
    }, [
        storageReady,
        user?.id,
        isActive,
        timeLeft,
        timerMode,
        focusIntention,
        tasks,
        workMinStr,
        breakMinStr,
        soundEnabled,
    ]);

    const handlePhaseComplete = useCallback(() => {
        const {
            workDuration: wMin,
            breakDuration: bMin,
            timerMode: mode,
            focusIntention: intention,
            tasks: taskList,
        } = phaseRef.current;

        if (mode === "work") {
            const extMsg = `${wMin} min focus saved.${intention.trim() ? ` “${intention.trim()}”` : ""} Time for a short break.`;
            void persistSession({
                type: "work",
                durationMinutes: wMin,
                actualMinutes: wMin,
                completed: true,
                task: intention.trim(),
                subtasks: taskList.map((t) => ({ text: t.text, completed: t.completed })),
            });
            showToast(`Focus block complete — ${wMin} min saved. Time for a break.`);
            if (soundEnabled) playPhaseEndChime();
            showBrowserNotification("Deep work complete", extMsg);
            requestExtensionWorkspaceToast({
                title: "Deep work complete",
                message: extMsg,
                systemNotify: true,
            });
            setTimerMode("break");
            setTimeLeft(bMin * 60);
            setReflectionDraft("");
            setReflectionOpen(true);
        } else {
            const extMsg = `Ready for another ${wMin} minute focus stretch.`;
            void persistSession({
                type: "short_break",
                durationMinutes: bMin,
                actualMinutes: bMin,
                completed: true,
                task: "",
                subtasks: [],
            });
            showToast(`Break done — ready for another ${wMin} min focus stretch.`);
            if (soundEnabled) playPhaseEndChime();
            showBrowserNotification("Break complete", extMsg);
            requestExtensionWorkspaceToast({
                title: "Break complete",
                message: extMsg,
                systemNotify: true,
            });
            setTimerMode("work");
            setTimeLeft(wMin * 60);
        }
    }, [persistSession, showToast, soundEnabled]);

    const runPhaseComplete = useCallback(() => {
        if (phaseTransitionLockRef.current) return;
        phaseTransitionLockRef.current = true;
        setIsActive(false);
        setTimeLeft(0);
        window.queueMicrotask(() => {
            try {
                handlePhaseComplete();
            } finally {
                phaseTransitionLockRef.current = false;
            }
        });
    }, [handlePhaseComplete]);

    useEffect(() => {
        if (!isActive) return undefined;
        const tick = () => {
            const end = phaseEndTimeRef.current;
            const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                runPhaseComplete();
            }
        };
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [isActive, runPhaseComplete]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState !== "visible" || !isActiveRef.current) return;
            const end = phaseEndTimeRef.current;
            const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                runPhaseComplete();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [runPhaseComplete]);

    const totalSeconds = timerMode === "work" ? workMinutes * 60 : breakMinutes * 60;
    const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

    const toggleTimer = useCallback(() => {
        void requestNotificationPermission();
        setIsActive((was) => {
            if (was) return false;
            phaseEndTimeRef.current = Date.now() + timeLeftRef.current * 1000;
            return true;
        });
    }, []);

    const resetTimer = () => {
        phaseTransitionLockRef.current = false;
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

    const saveReflection = useCallback(() => {
        const t = reflectionDraft.trim();
        if (t) {
            try {
                const raw = localStorage.getItem(SESSION_REFLECTIONS_KEY);
                const arr = raw ? JSON.parse(raw) : [];
                const next = Array.isArray(arr) ? arr : [];
                next.unshift({ text: t.slice(0, 500), at: new Date().toISOString() });
                localStorage.setItem(SESSION_REFLECTIONS_KEY, JSON.stringify(next.slice(0, 25)));
            } catch {
                /* ignore */
            }
            showToast("Saved — see it on AI Insights.");
            dispatchReflectionsUpdated();
        }
        setReflectionOpen(false);
        setReflectionDraft("");
    }, [reflectionDraft, showToast]);

    const skipReflection = useCallback(() => {
        setReflectionOpen(false);
        setReflectionDraft("");
    }, []);

    if (!user) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 relative">
            <TimerAlertsOnboarding />
            <AnimatePresence>
                {reflectionOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="fixed bottom-6 left-1/2 z-[90] w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-2xl border-2 border-primary/35 bg-background/95 p-4 shadow-2xl backdrop-blur-md"
                        role="dialog"
                        aria-label="Optional session note"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">Optional</p>
                        <p className="text-sm font-bold text-foreground mb-2">What did you just get done?</p>
                        <textarea
                            value={reflectionDraft}
                            onChange={(e) => setReflectionDraft(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="e.g. Finished design mockups for checkout"
                            className="mb-3 w-full resize-none rounded-xl border-2 border-ui bg-foreground/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                        />
                        <div className="flex flex-wrap gap-2 justify-end">
                            <button type="button" onClick={skipReflection} className="btn-secondary text-xs font-bold px-4 py-2">
                                Skip
                            </button>
                            <button type="button" onClick={saveReflection} className="btn-primary text-xs font-bold px-4 py-2">
                                Save note
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
                            onClick={toggleTimer}
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
                        Finish a full work or break round to save it under Past Sessions. Pause anytime. Focus, subtasks, and
                        timer state are saved in this browser and restored after refresh. Allow notifications when prompted for
                        alerts in other tabs.
                    </p>
                    <label className="flex cursor-pointer items-center justify-center gap-2.5 text-[10px] text-muted select-none max-w-md mx-auto text-center">
                        <input
                            type="checkbox"
                            checked={soundEnabled}
                            onChange={(e) => setSoundEnabled(e.target.checked)}
                            className="size-3.5 rounded border-2 border-ui bg-foreground/5 accent-primary shrink-0"
                        />
                        <Volume2 size={14} className="shrink-0 text-primary opacity-90" aria-hidden />
                        <span className="leading-snug">Short sound when a phase ends (works best after you press Start once)</span>
                    </label>
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
