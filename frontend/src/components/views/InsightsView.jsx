"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { trackingService } from "@/services/tracking.service";
import { goalsService, goalsProgressTodayList } from "@/services/goals.service";
import { requestExtensionSync, requestExtensionWorkspaceToast } from "@/lib/extensionSync";
import {
    BrainCircuit,
    Sparkles,
    Activity,
    Zap,
    TrendingUp,
    Clock,
    Target,
    RefreshCw,
    Calendar,
    ArrowRight,
    Timer,
    Focus,
    Layers,
    Info,
    Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import BurnoutRiskChart from "@/components/D3Charts";
import { buildTomorrowFocusIcs } from "@/lib/buildTomorrowFocusIcs";
import { readSessionReflections, REFLECTIONS_UPDATED_EVENT } from "@/lib/sessionReflections";

export default function InsightsView() {
    const { user } = useAuth();
    const { setActiveTab } = useDashboard();
    const [metrics, setMetrics] = useState(null);
    const [yesterdayMetrics, setYesterdayMetrics] = useState(null);
    const [cognitiveMetrics, setCognitiveMetrics] = useState([]);
    const [insightsData, setInsightsData] = useState(null);
    const [goals, setGoals] = useState([]);
    const [deepSessions, setDeepSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [weekStats, setWeekStats] = useState(null);
    const [reflectionTick, setReflectionTick] = useState(0);

    const synchronizeInsights = useCallback(async () => {
        setLoading(true);
        try {
            const settled = await Promise.allSettled([
                trackingService.getSummary("today"),
                trackingService.getSummary("yesterday"),
                trackingService.getCognitiveLoad(),
                goalsService.getObjectives(),
                trackingService.getDeepWorkHistory(),
                trackingService.getSummary("week"),
            ]);

            const today = settled[0].status === "fulfilled" ? settled[0].value : null;
            const yest = settled[1].status === "fulfilled" ? settled[1].value : null;
            const cognitiveResponse = settled[2].status === "fulfilled" ? settled[2].value : { history: [], metrics: null };
            const goalsData = settled[3].status === "fulfilled" ? settled[3].value : [];
            const deep = settled[4].status === "fulfilled" ? settled[4].value : [];
            const week = settled[5].status === "fulfilled" ? settled[5].value : null;

            setMetrics(today);
            setYesterdayMetrics(yest);
            setCognitiveMetrics(cognitiveResponse?.history || []);
            setInsightsData(cognitiveResponse?.metrics || null);
            setGoals(goalsProgressTodayList(goalsData));
            setDeepSessions(Array.isArray(deep) ? deep.slice(0, 5) : []);
            setWeekStats(week);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("error fetching insights:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) synchronizeInsights();
    }, [user, synchronizeInsights]);

    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState === "visible") synchronizeInsights();
        };
        document.addEventListener("visibilitychange", onVis);
        const intervalId = window.setInterval(() => synchronizeInsights(), 3 * 60 * 1000);
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            window.clearInterval(intervalId);
        };
    }, [synchronizeInsights]);

    useEffect(() => {
        const bump = () => setReflectionTick((x) => x + 1);
        window.addEventListener(REFLECTIONS_UPDATED_EVENT, bump);
        return () => window.removeEventListener(REFLECTIONS_UPDATED_EVENT, bump);
    }, []);

    const firstName = user?.name?.trim()?.split(/\s+/)?.[0] ?? "there";
    const focusSessionMinutes = Math.min(180, Math.max(5, Number(user?.preferences?.focusSessionMinutes) || 25));

    const latestLoad = (() => {
        const last = cognitiveMetrics[cognitiveMetrics.length - 1];
        const v = Number(last?.loadScore);
        return Number.isFinite(v) ? v : 0;
    })();

    const attentionFromLatestHour = useMemo(() => {
        const last = cognitiveMetrics[cognitiveMetrics.length - 1];
        if (!last?.time) {
            return {
                band: "—",
                sub: "Use the extension for a few hours; we estimate load per calendar hour from scroll, click, and time on page.",
            };
        }
        const d = new Date(last.time);
        const tf = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
        const v = Number(last.loadScore);
        const band = !Number.isFinite(v)
            ? "—"
            : v > 7
              ? "High — consider a break"
              : v > 4
                ? "Moderate"
                : "Comfortable";
        return {
            band,
            sub: `Latest synced hour: ${tf.format(d)} (your local time). This is not a live second-by-second reading.`,
        };
    }, [cognitiveMetrics]);

    const peakMeta = useMemo(() => {
        const valid = cognitiveMetrics.filter((p) => p?.time != null && Number.isFinite(Number(p?.loadScore)));
        if (valid.length < 1) return { validCount: valid.length, best: null };
        let best = valid[0];
        for (const p of valid) {
            if (Number(p.loadScore) > Number(best.loadScore)) best = p;
        }
        const d = new Date(best.time);
        return {
            validCount: valid.length,
            best: Number.isNaN(d.getTime()) ? null : { date: d, iso: best.time },
        };
    }, [cognitiveMetrics]);

    const peakWindowCopy = (() => {
        if (peakMeta.validCount < 2) {
            return "Use the ProdLytics extension for a few hours; we then show the part of the day when you were most active.";
        }
        if (!peakMeta.best) return "We need a bit more hourly data to name your usual peak work window.";
        const h = peakMeta.best.date.getHours();
        const label = (x) =>
            new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, x, 0));
        const endH = Math.min(23, h + 2);
        return `Today you looked most engaged around ${label(h)}–${label(endH)} (your local time)—a good window for hard tasks.`;
    })();

    const tomorrowPlanCopy = (() => {
        if (peakMeta.validCount < 2 || !peakMeta.best) {
            return "After a few more hours of extension data, we will suggest a specific time tomorrow to block for deep work.";
        }
        const d = peakMeta.best.date;
        const h = d.getHours();
        const mi = d.getMinutes();
        const startAnchor = new Date(2000, 0, 1, h, mi);
        const endAnchor = new Date(startAnchor.getTime() + focusSessionMinutes * 60 * 1000);
        const tf = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
        return `For tomorrow, try putting ${focusSessionMinutes} minutes of uninterrupted work on your calendar from about ${tf.format(startAnchor)} to ${tf.format(endAnchor)}. That matches when you were strongest today.`;
    })();

    const scoreDeltaVsYesterday = (() => {
        const todayS = Number(metrics?.score);
        const yS = Number(yesterdayMetrics?.score);
        const yTotal =
            (Number(yesterdayMetrics?.productiveTime) || 0) +
            (Number(yesterdayMetrics?.unproductiveTime) || 0) +
            (Number(yesterdayMetrics?.neutralTime) || 0);
        if (!Number.isFinite(todayS) || yTotal < 120) return null;
        if (!Number.isFinite(yS)) return null;
        return todayS - yS;
    })();

    const goTab = (tab) => setActiveTab(tab);

    const downloadTomorrowFocusIcs = useCallback(() => {
        if (!peakMeta.best) return;
        const d0 = peakMeta.best.date;
        const h = d0.getHours();
        const mi = d0.getMinutes();
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, mi, 0, 0);
        const end = new Date(start.getTime() + focusSessionMinutes * 60 * 1000);
        const dk = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
        const ics = buildTomorrowFocusIcs({
            title: `ProdLytics focus (${focusSessionMinutes} min)`,
            start,
            end,
            uid: `prodlytics-focus-${dk}@prodlytics.app`,
        });
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `prodlytics-focus-${dk}.ics`;
        a.click();
        URL.revokeObjectURL(url);
    }, [peakMeta.best, focusSessionMinutes]);

    const toastBreak = () =>
        requestExtensionWorkspaceToast({
            title: "Time for a screen break",
            message: "Step away for a few minutes—your load signal was elevated.",
            variant: "info",
            systemNotify: true,
        });

    const toastFlow = () =>
        requestExtensionWorkspaceToast({
            title: "Stay in flow",
            message: "Protect this window—minimize context switches until your next break.",
            variant: "success",
        });

    const getRecommendations = () => {
        const recs = [];
        const prod = Number(metrics?.productiveTime);
        const unprod = Number(metrics?.unproductiveTime);

        if (latestLoad > 7) {
            recs.push({
                key: "overload",
                title: "Time for a break",
                desc: "Your activity pattern looks intense—step away from the screen for 10–15 minutes.",
                icon: <Zap className="text-red-400" />,
                type: "warning",
                actions: [
                    { label: "Break timer", tab: "timer", icon: Timer },
                    { label: "Nudge me", onClick: toastBreak },
                ],
            });
        }
        if (Number(metrics?.score) > 80) {
            recs.push({
                key: "flow",
                title: "Strong focus today",
                desc: "Most of your tracked time is on productive work. Good moment to protect this window.",
                icon: <Sparkles className="text-primary" />,
                type: "success",
                actions: [
                    { label: "Focus mode", tab: "focus", icon: Focus },
                    { label: "Pin this", onClick: toastFlow },
                ],
            });
        }
        if (Number.isFinite(prod) && Number.isFinite(unprod) && unprod > prod) {
            recs.push({
                key: "distraction",
                title: "More distraction than work",
                desc: "So far today, distracting sites outweigh productive ones. A short focus block can reset the day.",
                icon: <Activity className="text-orange-400" />,
                type: "info",
                actions: [
                    { label: "Goals", tab: "goals", icon: Target },
                    { label: "Focus mode", tab: "focus", icon: Focus },
                ],
            });
        }
        recs.push({
            key: "peak",
            title: "Your best time to work",
            desc: peakWindowCopy,
            icon: <Clock className="text-secondary" />,
            type: "neutral",
            actions: [
                { label: "Sync extension", onClick: () => requestExtensionSync() },
                { label: "Extension setup", tab: "setup" },
            ],
        });
        return recs;
    };

    const milestone = useMemo(
        () => getMilestoneCard(metrics, cognitiveMetrics, insightsData?.deepWorkHours),
        [metrics, cognitiveMetrics, insightsData]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastUpdated + reflectionTick intentionally invalidate localStorage read
    const recentReflections = useMemo(() => readSessionReflections(5), [lastUpdated, reflectionTick]);

    if (!user) return null;

    const m = insightsData || {};
    const intensityPct = formatMetricPercent(m.intensity);
    const persistencePct = formatMetricPercent(m.resilience);
    const cognitivePct = formatMetricPercent(m.drag);
    const deepRatioPct = formatMetricPercent(m.ratio, true);
    const deepHours = Number.isFinite(Number(m.deepWorkHours)) ? Number(m.deepWorkHours) : 0;

    const topGoals = goals.filter((g) => g?.isActive !== false).slice(0, 4);
    const updatedLabel =
        lastUpdated &&
        new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(lastUpdated);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            {/* Plain-language intro so viewers (e.g. demo panel) understand the page without a verbal pitch */}
            <section
                className="rounded-[32px] border-2 border-primary/25 bg-primary/[0.06] p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10 items-start"
                aria-label="What this page shows"
            >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30">
                    <Lightbulb className="text-primary" size={28} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                    <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight">
                        What this page is (read this first)
                    </h2>
                    <p className="text-sm md:text-base text-foreground/90 font-medium leading-relaxed max-w-3xl">
                        <strong>ProdLytics</strong> uses your <strong>browser extension</strong> to learn how you actually use the web—not
                        to spy, but to estimate <strong>focus</strong>, <strong>distraction</strong>, and{" "}
                        <strong>when your attention is strongest</strong>. Below you see today&apos;s summary, a{" "}
                        <strong>suggested time for tomorrow</strong>, your goals, a day chart, and buttons to act (focus, timer,
                        sync).
                    </p>
                    <ul className="grid sm:grid-cols-3 gap-3 text-xs md:text-sm text-muted font-medium leading-snug">
                        <li className="flex gap-2">
                            <Info className="shrink-0 text-secondary mt-0.5" size={16} aria-hidden />
                            <span>
                                <span className="text-foreground font-bold">Focus score</span> — productive time vs distracting
                                sites.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <Info className="shrink-0 text-secondary mt-0.5" size={16} aria-hidden />
                            <span>
                                <span className="text-foreground font-bold">The curve</span> — estimated mental effort by hour
                                from activity.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <Info className="shrink-0 text-secondary mt-0.5" size={16} aria-hidden />
                            <span>
                                <span className="text-foreground font-bold">Tomorrow&apos;s block</span> — schedule hint from
                                today&apos;s peak.
                            </span>
                        </li>
                    </ul>
                </div>
            </section>

            <section
                className="glass-card rounded-[32px] border-2 border-ui p-6 md:p-8"
                aria-label="Week at a glance"
            >
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-muted mb-2">Rolling 7 days</h2>
                        <p className="text-xl font-black text-foreground/95 tracking-tight">Week at a glance</p>
                        <p className="mt-3 text-sm text-muted font-medium leading-relaxed max-w-2xl">
                            Same focus score idea as today, stretched across your last week of extension-tracked browsing. One bad
                            day doesn&apos;t erase the trend.
                        </p>
                        <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-4 text-sm">
                            <li>
                                <span className="block text-[10px] font-black uppercase text-muted tracking-widest mb-1">
                                    Focus score
                                </span>
                                <span className="text-2xl font-black text-primary">
                                    {weekStats?.score != null ? `${weekStats.score}%` : "—"}
                                </span>
                            </li>
                            <li>
                                <span className="block text-[10px] font-black uppercase text-muted tracking-widest mb-1">
                                    Productive (approx.)
                                </span>
                                <span className="text-2xl font-black text-foreground/90">
                                    {weekStats?.productiveTime != null
                                        ? `${Math.round((Number(weekStats.productiveTime) / 3600) * 10) / 10}h`
                                        : "—"}
                                </span>
                            </li>
                            <li>
                                <span className="block text-[10px] font-black uppercase text-muted tracking-widest mb-1">
                                    Distracting (approx.)
                                </span>
                                <span className="text-2xl font-black text-foreground/90">
                                    {weekStats?.unproductiveTime != null
                                        ? `${Math.round((Number(weekStats.unproductiveTime) / 3600) * 10) / 10}h`
                                        : "—"}
                                </span>
                            </li>
                        </ul>
                    </div>
                    {recentReflections.length > 0 ? (
                        <div className="w-full shrink-0 lg:max-w-sm lg:border-l border-ui lg:pl-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3">
                                After focus — your notes
                            </h3>
                            <ul className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {recentReflections.map((r, i) => (
                                    <li
                                        key={`${r.at}-${i}`}
                                        className="rounded-xl border border-ui bg-foreground/[0.02] p-3 text-xs text-muted"
                                    >
                                        <p className="font-bold text-foreground/90 leading-snug">{r.text}</p>
                                        <p className="text-[10px] font-medium mt-1 opacity-80">
                                            {r.at ? new Date(r.at).toLocaleString() : ""}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            </section>

            <header className="glass-card relative overflow-hidden rounded-[50px] p-10 md:p-12">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -mr-40 -mt-40" />
                <div className="relative z-10 flex flex-col gap-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-primary font-black text-xs uppercase tracking-[0.4em]">
                            <Sparkles size={16} /> AI INSIGHTS · SMART SUMMARY FROM YOUR DAY
                        </div>
                        <div className="flex items-center gap-3">
                            {updatedLabel && (
                                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">
                                    Updated {updatedLabel}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => synchronizeInsights()}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-2xl border-2 border-ui bg-foreground/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/90 hover:bg-primary/10 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="max-w-2xl w-full">
                            <h1 className="mb-4 text-4xl font-black leading-[0.95] tracking-tighter text-foreground md:text-5xl lg:text-6xl">
                                {Number(metrics?.score) >= 65 ? (
                                    <>
                                        Optimal focus is within reach,{" "}
                                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                            {firstName}
                                        </span>
                                        .
                                    </>
                                ) : (
                                    <>
                                        Your focus snapshot,{" "}
                                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                            {firstName}
                                        </span>
                                        .
                                    </>
                                )}
                            </h1>
                            <p className="text-lg md:text-xl text-muted font-medium leading-relaxed">
                                <span className="text-foreground/80 font-bold">Focus score today:</span>{" "}
                                <span className="font-bold text-foreground">{metrics?.score ?? 0}%</span>
                                <span className="text-muted text-base font-normal">
                                    {" "}
                                    (how much tracked time went to productive sites)
                                </span>
                                {scoreDeltaVsYesterday != null && (
                                    <span
                                        className={
                                            scoreDeltaVsYesterday >= 0 ? " text-success font-bold" : " text-orange-400 font-bold"
                                        }
                                    >
                                        {" "}
                                        — {scoreDeltaVsYesterday >= 0 ? "+" : ""}
                                        {scoreDeltaVsYesterday} points vs yesterday
                                    </span>
                                )}
                                .{" "}
                                <span className="text-foreground/80 font-bold">Estimated attention load (latest synced hour):</span>{" "}
                                <span className="text-secondary font-bold">{attentionFromLatestHour.band}</span>
                                <span className="text-muted text-base font-normal block mt-2 sm:inline sm:mt-0 sm:before:content-[' ']">
                                    {attentionFromLatestHour.sub}
                                </span>
                            </p>
                            {updatedLabel ? (
                                <p className="mt-3 text-xs font-medium text-muted leading-relaxed max-w-2xl">
                                    <span className="text-foreground/80 font-bold">Data freshness:</span> dashboard refreshed at{" "}
                                    {updatedLabel}. This page also refreshes when you return to the tab and about every 3 minutes.
                                    Use <strong className="text-foreground/90">Sync Extension</strong> in the header so new browsing
                                    shows up here.
                                </p>
                            ) : null}
                            <div className="mt-6 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => goTab("timer")}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 hover:opacity-95"
                                >
                                    <Timer size={16} />
                                    Open deep work timer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goTab("focus")}
                                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-ui bg-foreground/[0.03] px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-foreground/[0.06]"
                                >
                                    <Focus size={16} />
                                    Focus mode
                                </button>
                                <button
                                    type="button"
                                    onClick={downloadTomorrowFocusIcs}
                                    disabled={!peakMeta.best}
                                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-secondary/40 bg-secondary/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/90 hover:bg-secondary/15 disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    <Calendar size={16} />
                                    Add tomorrow block (.ics)
                                </button>
                            </div>
                            {Number(metrics?.streak) > 0 && (
                                <p className="mt-3 text-sm font-bold text-foreground/80">
                                    {metrics.streak}-day productive streak — consistency compounds.
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0 relative group">
                            <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-700" />
                            <div className="relative flex h-44 w-44 md:h-48 md:w-48 flex-col items-center justify-center rounded-full border-[10px] border-solid border-ui bg-background/50 backdrop-blur-3xl">
                                <span className="text-5xl font-black tracking-tighter">{metrics?.score ?? 0}%</span>
                                <span className="text-[10px] font-black text-muted uppercase tracking-widest mt-1">Focus score</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Today's objectives + planner */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 glass-card border-2 border-primary/20 p-8 rounded-[40px] bg-gradient-to-br from-primary/[0.07] to-transparent">
                    <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.35em] text-primary mb-2">
                        <Calendar size={16} /> Plan ahead — suggested focus time for tomorrow
                    </div>
                    <p className="text-sm text-muted font-medium mb-4 max-w-2xl">
                        We use <strong className="text-foreground/90">when you were most engaged today</strong> plus your{" "}
                        <strong className="text-foreground/90">preferred focus length</strong> in settings—not random advice.
                    </p>
                    <p className="text-lg font-black text-foreground/95 leading-snug mb-4">{tomorrowPlanCopy}</p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => goTab("focus")}
                            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-opacity"
                        >
                            Open focus mode
                            <ArrowRight size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => goTab("timer")}
                            className="inline-flex items-center gap-2 rounded-2xl border-2 border-ui bg-foreground/[0.03] px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-foreground/[0.06]"
                        >
                            <Timer size={16} />
                            Timer
                        </button>
                        <button
                            type="button"
                            onClick={downloadTomorrowFocusIcs}
                            disabled={!peakMeta.best}
                            className="inline-flex items-center gap-2 rounded-2xl border-2 border-secondary/40 bg-secondary/10 px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-secondary/15 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <Calendar size={16} />
                            Download .ics
                        </button>
                    </div>
                </div>
                <div className="xl:col-span-5 glass-card p-8 rounded-[40px]">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.35em] text-muted">
                                <Target size={16} className="text-secondary" /> Goals you set — progress today
                            </div>
                            <p className="text-[11px] text-muted font-medium leading-snug pl-0.5">
                                Same numbers as the Goals tab; driven by extension tracking.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => goTab("goals")}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                        >
                            Manage
                        </button>
                    </div>
                    {topGoals.length === 0 ? (
                        <p className="text-sm text-muted font-medium leading-relaxed">
                            No goals yet. Open <strong className="text-foreground/80">Goals</strong> to add one (e.g. daily
                            productive hours)—then this card shows live progress.
                        </p>
                    ) : (
                        <ul className="space-y-4">
                            {topGoals.map((g) => (
                                <li key={g._id}>
                                    <button
                                        type="button"
                                        onClick={() => goTab("goals")}
                                        className="w-full text-left group"
                                    >
                                        <div className="flex justify-between gap-2 text-xs font-black text-foreground/90 mb-1.5">
                                            <span className="truncate">
                                                {g.label || g.website || (g.type === "productive" ? "Productive time" : "Limit")}
                                            </span>
                                            <span className="shrink-0 text-secondary">{g.progress ?? 0}%</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, Math.max(0, Number(g.progress) || 0))}%` }}
                                                className="h-full bg-gradient-to-r from-primary to-secondary"
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-muted mt-1 inline-block">
                                            {formatTrackedShort(g.currentSeconds)} / {formatTrackedShort(g.targetSeconds)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {deepSessions.length > 0 && (
                <section className="glass-card p-8 rounded-[40px]">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] flex items-center gap-3">
                                <Layers size={16} className="text-primary" /> Recent focus sessions (from Timer)
                            </h3>
                            <p className="text-xs text-muted font-medium mt-2 max-w-xl">
                                Pomodoros and work blocks you logged here prove you turned insight into action.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => goTab("timer")}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                        >
                            Log another in Timer
                        </button>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deepSessions.map((s) => (
                            <li
                                key={s._id}
                                className="rounded-2xl border-2 border-ui bg-foreground/[0.02] p-4 hover:bg-foreground/[0.04] transition-colors"
                            >
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">
                                    {s.type === "work" ? "Work" : s.type === "short_break" ? "Short break" : "Break"} ·{" "}
                                    {s.actualMinutes ?? s.durationMinutes ?? "—"} min
                                </div>
                                <p className="text-sm font-black text-foreground/90 line-clamp-2">
                                    {s.task?.trim() || "Focused session"}
                                </p>
                                <p className="text-[10px] font-bold text-muted mt-2">
                                    {s.startedAt
                                        ? new Intl.DateTimeFormat(undefined, {
                                              month: "short",
                                              day: "numeric",
                                              hour: "numeric",
                                              minute: "2-digit",
                                          }).format(new Date(s.startedAt))
                                        : ""}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    <section>
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] mb-3 flex items-center gap-3">
                            <TrendingUp size={16} /> Smart suggestions — not just text
                        </h3>
                        <p className="text-sm text-muted font-medium mb-8 max-w-2xl">
                            Rules read your today&apos;s data and suggest the next step. Each card has{" "}
                            <strong className="text-foreground/80">buttons</strong> (Focus, Timer, Goals, Sync) so this screen is{" "}
                            <strong className="text-foreground/80">actionable</strong>, not only a passive chart wall.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {getRecommendations().map((rec, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    key={rec.key}
                                    className="group relative overflow-hidden rounded-[40px] border-2 border-ui bg-foreground/[0.02] p-8 pb-6 transition-all hover:bg-foreground/[0.05] flex flex-col"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                        {rec.icon}
                                    </div>
                                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ui-muted bg-foreground/5">
                                        {rec.icon}
                                    </div>
                                    <h4 className="text-lg font-black mb-2">{rec.title}</h4>
                                    <p className="text-sm text-muted leading-relaxed font-medium flex-1 mb-6">{rec.desc}</p>
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-ui/80">
                                        {rec.actions.map((a, j) => {
                                            const Icon = a.icon;
                                            return (
                                                <button
                                                    key={j}
                                                    type="button"
                                                    onClick={() => {
                                                        if (a.tab) goTab(a.tab);
                                                        if (typeof a.onClick === "function") a.onClick();
                                                    }}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-ui bg-background/60 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-foreground/90 hover:border-primary/50 hover:bg-primary/10 transition-colors"
                                                >
                                                    {Icon ? <Icon size={12} /> : null}
                                                    {a.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    <section className="glass-card p-10">
                        <h3 className="mb-2 flex items-center gap-3 text-xl font-black text-foreground/90">
                            <Activity className="text-secondary" /> Your estimated mental effort through the day
                        </h3>
                        <p className="text-sm text-muted font-medium mb-8 max-w-3xl">
                            Each point is one hour bucket from the <strong className="text-foreground/80">extension</strong>: how
                            much you scrolled, clicked, and stayed on pages. Higher = busier attention, not a medical measure.{" "}
                            <strong className="text-foreground/80">Hover</strong> a dot for exact time and score.
                        </p>
                        <div className="h-[350px] w-full flex items-center justify-center">
                            {loading ? (
                                <div className="text-muted/40 animate-pulse font-black uppercase tracking-widest text-xs">
                                    Loading your chart…
                                </div>
                            ) : (
                                <BurnoutRiskChart data={cognitiveMetrics} />
                            )}
                        </div>
                    </section>
                </div>

                <aside className="space-y-10">
                    <div className="glass-card bg-gradient-to-b from-primary/5 to-transparent p-10">
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] mb-2 flex items-center gap-3">
                            <BrainCircuit size={16} /> Today in four numbers
                        </h3>
                        <p className="text-xs text-muted font-medium mb-8 leading-relaxed">
                            Plain-language names; values come from your last 24h of tracked browsing.
                        </p>
                        <div className="space-y-8">
                            <MetricRow
                                label="Activity level"
                                value={intensityPct}
                                sub="Scrolls & clicks"
                                explain="How “busy” your browsing looked—more motion usually means shallower reading or multitasking."
                                color="primary"
                                fill={clampPctWidth(m.intensity)}
                            />
                            <MetricRow
                                label="Staying on task"
                                value={persistencePct}
                                sub="Session length"
                                explain="Longer average time on sites before switching suggests deeper sessions."
                                color="success"
                                fill={clampPctWidth(m.resilience)}
                            />
                            <MetricRow
                                label="Attention strain (estimate)"
                                value={cognitivePct}
                                sub="Derived from patterns"
                                explain="Higher when sessions are shorter or more fragmented—not a diagnosis, just a workload hint."
                                color="danger"
                                fill={clampPctWidth(m.drag)}
                            />
                            <MetricRow
                                label="Share on productive sites"
                                value={deepRatioPct}
                                sub={`~${deepHours}h deep work window`}
                                explain="Productive-site time vs all tracked time in the last 24 hours."
                                color="secondary"
                                fill={clampPctWidth(m.ratio)}
                            />
                        </div>
                    </div>

                    <div className="p-8 rounded-[40px] bg-secondary/10 border border-secondary/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl -z-10" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-secondary mb-2 tracking-[0.3em]">
                            Encouragement from your data
                        </h4>
                        <p className="text-[11px] text-muted font-medium mb-4">
                            Streaks and depth—no fake “top 5%” unless you earn it with real usage.
                        </p>
                        <p className="text-lg font-black leading-tight text-foreground/90">{milestone.title}</p>
                        <p className="mt-3 text-sm font-medium text-muted leading-relaxed">{milestone.body}</p>
                        <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${milestone.barPct}%` }}
                                className="h-full bg-secondary"
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function getMilestoneCard(metrics, cognitiveMetrics, deepWorkHoursRaw) {
    const streak = Number(metrics?.streak) || 0;
    const score = Number(metrics?.score) || 0;
    const samples = cognitiveMetrics.length;
    const totalTracked =
        (Number(metrics?.productiveTime) || 0) +
        (Number(metrics?.unproductiveTime) || 0) +
        (Number(metrics?.neutralTime) || 0);
    const deepH = Number(deepWorkHoursRaw);
    const deepOk = Number.isFinite(deepH) ? deepH : 0;

    if (samples < 2 && totalTracked < 180) {
        return {
            title: "Calibrate your insights",
            body: "Browse with the ProdLytics extension for a day—milestones and peak windows will match your real rhythms.",
            barPct: 18,
        };
    }
    if (streak >= 7) {
        return {
            title: "Unstoppable streak",
            body: `${streak} productive days in a row. You're building a serious habit.`,
            barPct: Math.min(100, 42 + Math.min(streak, 14) * 4),
        };
    }
    if (streak >= 3) {
        return {
            title: "Momentum locked in",
            body: `${streak}-day streak—small consistent wins beat occasional heroics.`,
            barPct: Math.min(100, 38 + streak * 8),
        };
    }
    if (score >= 85) {
        return {
            title: "Elite focus day",
            body: "Your productive share is outstanding today. Protect this window from low-value tabs.",
            barPct: Math.min(100, score),
        };
    }
    if (deepOk >= 3) {
        return {
            title: "Deep work in the bank",
            body: `Roughly ${deepOk}h on productive sites in the last 24h—strong depth signal.`,
            barPct: Math.min(100, 35 + deepOk * 12),
        };
    }
    if (streak >= 1) {
        return {
            title: "Keep the chain going",
            body: "You're on the board—come back tomorrow to extend your streak.",
            barPct: Math.min(100, 28 + streak * 12),
        };
    }
    return {
        title: "Keep tracking",
        body: "Every hour of data sharpens peak windows, load curves, and your objectives.",
        barPct: Math.min(100, Math.max(22, score)),
    };
}

function formatMetricPercent(n, allowDecimal = false) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0%";
    if (allowDecimal && v > 0 && v < 1) return `${v.toFixed(1)}%`;
    if (allowDecimal && !Number.isInteger(v)) return `${v.toFixed(1)}%`;
    return `${Math.round(v)}%`;
}

function clampPctWidth(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0%";
    return `${Math.min(100, Math.max(0, v))}%`;
}

function formatTrackedShort(seconds) {
    const s = Number(seconds) || 0;
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
}

function MetricRow({ label, value, sub, explain, color, fill }) {
    const colors = { primary: "bg-primary", success: "bg-success", danger: "bg-danger", secondary: "bg-secondary" };
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">{label}</div>
                    <div className="text-lg font-black text-foreground/90">{value}</div>
                </div>
                <div className="text-[10px] font-bold text-muted/60 text-right shrink-0 max-w-[120px]">{sub}</div>
            </div>
            {explain ? <p className="text-[11px] text-muted/90 leading-relaxed font-medium">{explain}</p> : null}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <motion.div initial={{ width: 0 }} animate={{ width: fill }} className={`h-full ${colors[color]}`} />
            </div>
        </div>
    );
}
