"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import {
    DEEP_WORK_TIMER_SYNC_EVENT,
    formatTimerMmSs,
    readDeepWorkTimerSnapshot,
} from "@/lib/deepWorkTimerStorage";
import { Timer, Coffee, Zap } from "lucide-react";

function remainingSecondsFromSnapshot(snap) {
    if (!snap) return 0;
    if (snap.isActive && typeof snap.phaseEndsAt === "number" && snap.phaseEndsAt > 0) {
        return Math.max(0, Math.ceil((snap.phaseEndsAt - Date.now()) / 1000));
    }
    return Math.max(0, Math.floor(Number(snap.timeLeft) || 0));
}

function parseMinStr(raw, fallback) {
    const n = Number.parseInt(String(raw ?? "").replace(/\D/g, ""), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(180, Math.max(1, n));
}

export default function DeepWorkTimerStrip() {
    const { user } = useAuth();
    const { setActiveTab } = useDashboard();
    const [tick, setTick] = useState(0);

    const refresh = useCallback(() => setTick((t) => t + 1), []);

    useEffect(() => {
        const onSync = () => refresh();
        window.addEventListener(DEEP_WORK_TIMER_SYNC_EVENT, onSync);
        const id = window.setInterval(refresh, 1000);
        return () => {
            window.removeEventListener(DEEP_WORK_TIMER_SYNC_EVENT, onSync);
            window.clearInterval(id);
        };
    }, [refresh]);

    if (!user?.id) return null;

    const snap = readDeepWorkTimerSnapshot();
    if (!snap || String(snap.userId) !== String(user.id)) return null;

    const isWork = snap.timerMode !== "break";
    const active = !!snap.isActive;
    const remaining = remainingSecondsFromSnapshot(snap);
    const label = isWork ? "Focus" : "Break";
    const intention = typeof snap.focusIntention === "string" ? snap.focusIntention.trim() : "";

    const fullPhaseSec = (isWork ? parseMinStr(snap.workMinStr, 25) : parseMinStr(snap.breakMinStr, 5)) * 60;
    const pausedMidPhase = !active && remaining > 0 && remaining < fullPhaseSec;
    if (!active && !pausedMidPhase) return null;

    return (
        <div className="border-b border-ui bg-primary/[0.08] px-4 py-2.5">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 ${
                            isWork ? "border-primary/50 bg-primary/15 text-primary" : "border-secondary/50 bg-secondary/15 text-secondary"
                        }`}
                    >
                        {isWork ? <Zap size={18} /> : <Coffee size={18} />}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                            Deep work timer {active ? "· running" : "· paused"}
                        </p>
                        <p className="truncate text-sm font-black text-foreground">
                            <span className={isWork ? "text-primary" : "text-secondary"}>{label}</span>
                            <span className="mx-2 text-muted">·</span>
                            <span className="font-mono tabular-nums">{formatTimerMmSs(remaining)}</span>
                            {intention ? (
                                <span className="ml-2 text-xs font-medium text-muted truncate">— {intention}</span>
                            ) : null}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setActiveTab("timer")}
                    className="btn-secondary inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
                >
                    <Timer size={14} />
                    Open timer
                </button>
            </div>
        </div>
    );
}
