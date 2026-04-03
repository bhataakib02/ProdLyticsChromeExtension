"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { trackingService } from "@/services/tracking.service";
import { goalsService, goalsProgressTodayList } from "@/services/goals.service";
import { requestExtensionSync, requestExtensionWorkspaceToast } from "@/lib/extensionSync";
import {
    Activity,
    Sparkles,
    Zap,
    Clock,
    Target,
    Timer,
    Focus,
} from "lucide-react";
import { computeAiInsightsCoachReport } from "@/lib/aiInsightsCoach";
import { REFLECTIONS_UPDATED_EVENT } from "@/lib/sessionReflections";
import {
    coachProductivityScore,
    coachBehavioralPatterns,
    coachDistractionAlerts,
    coachPersonalizedSuggestions,
    coachWeeklyReport,
    coachPredictiveAnalytics,
    coachGoalBasedInsights,
    buildInsightsMilestone,
} from "@/lib/insightsCoachCopy";

export function formatTrackedShort(seconds) {
    const s = Number(seconds) || 0;
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
}

export function useAiCoachInsightsData() {
    const { user } = useAuth();
    const { setActiveTab } = useDashboard();
    const [metrics, setMetrics] = useState(null);
    const [yesterdayMetrics, setYesterdayMetrics] = useState(null);
    const [weekStats, setWeekStats] = useState(null);
    const [insightsData, setInsightsData] = useState(null);
    const [cognitiveMetrics, setCognitiveMetrics] = useState([]);
    const [hourlyMetrics, setHourlyMetrics] = useState(null);
    const [todayWebsites, setTodayWebsites] = useState(null);
    const [weekComparison, setWeekComparison] = useState(null);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reflectionTick, setReflectionTick] = useState(0);

    const focusSessionMinutes = Math.min(180, Math.max(5, Number(user?.preferences?.focusSessionMinutes) || 25));

    const synchronizeInsights = useCallback(async () => {
        setLoading(true);
        try {
            const settled = await Promise.allSettled([
                trackingService.getSummary("today"),
                trackingService.getSummary("yesterday"),
                trackingService.getSummary("week"),
                trackingService.getCognitiveLoad(),
                trackingService.getHourlyMetrics("today"),
                trackingService.getMetrics("today"),
                goalsService.getObjectives(),
                trackingService.getWeekComparison(),
            ]);

            const today = settled[0].status === "fulfilled" ? settled[0].value : null;
            const yest = settled[1].status === "fulfilled" ? settled[1].value : null;
            const week = settled[2].status === "fulfilled" ? settled[2].value : null;
            const cognitiveResponse = settled[3].status === "fulfilled" ? settled[3].value : { history: [], metrics: null };
            const hourly = settled[4].status === "fulfilled" ? settled[4].value : null;
            const sites = settled[5].status === "fulfilled" ? settled[5].value : null;
            const goalsData = settled[6].status === "fulfilled" ? settled[6].value : [];
            const weekComp = settled[7].status === "fulfilled" ? settled[7].value : null;

            setMetrics(today);
            setYesterdayMetrics(yest);
            setWeekStats(week);
            setCognitiveMetrics(cognitiveResponse?.history || []);
            setInsightsData(cognitiveResponse?.metrics || null);
            setHourlyMetrics(hourly);
            setTodayWebsites(sites);
            setGoals(goalsProgressTodayList(goalsData));
            setWeekComparison(weekComp);
        } catch (err) {
            console.error("ai coach sync:", err);
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

    const latestLoad = (() => {
        const last = cognitiveMetrics[cognitiveMetrics.length - 1];
        const v = Number(last?.loadScore);
        return Number.isFinite(v) ? v : 0;
    })();

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

    const firstName = user?.name?.trim()?.split(/\s+/)?.[0] ?? "there";

    const tomorrowPlanCopy = useMemo(() => {
        if (peakMeta.validCount < 2 || !peakMeta.best) {
            return "After a few more hours of extension data, we will suggest a specific time tomorrow to block for deep work.";
        }
        const d = peakMeta.best.date;
        const h = d.getHours();
        const mi = d.getMinutes();
        const startAnchor = new Date(2000, 0, 1, h, mi);
        const tf = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
        const endAnchor = new Date(startAnchor.getTime() + focusSessionMinutes * 60 * 1000);
        return `For tomorrow, try putting ${focusSessionMinutes} minutes of uninterrupted work on your calendar from about ${tf.format(startAnchor)} to ${tf.format(endAnchor)}. That matches when you were strongest today.`;
    }, [peakMeta, focusSessionMinutes]);

    const scoreDeltaVsYesterday = useMemo(() => {
        const todayS = Number(metrics?.score);
        const yS = Number(yesterdayMetrics?.score);
        const yTotal =
            (Number(yesterdayMetrics?.productiveTime) || 0) +
            (Number(yesterdayMetrics?.unproductiveTime) || 0) +
            (Number(yesterdayMetrics?.neutralTime) || 0);
        if (!Number.isFinite(todayS) || yTotal < 120) return null;
        if (!Number.isFinite(yS)) return null;
        return todayS - yS;
    }, [metrics, yesterdayMetrics]);

    const aiReport = useMemo(
        () =>
            computeAiInsightsCoachReport({
                hourlyMetrics,
                todayWebsites,
                weekComparison,
                goals,
                cognitiveMetrics,
                focusSessionMinutes,
            }),
        [hourlyMetrics, todayWebsites, weekComparison, goals, cognitiveMetrics, focusSessionMinutes]
    );

    const milestone = useMemo(
        () => buildInsightsMilestone(metrics, cognitiveMetrics, insightsData?.deepWorkHours),
        [metrics, cognitiveMetrics, insightsData]
    );

    const scoreGaugeValue = Math.min(100, Math.max(0, Number(aiReport?.productivityScore) || 0));
    const scoreGaugeColor =
        scoreGaugeValue >= 70 ? "var(--color-success)" : scoreGaugeValue >= 40 ? "var(--color-warning, #f59e0b)" : "var(--color-danger)";
    const scoreGaugeData = useMemo(() => [{ name: "score", value: scoreGaugeValue, fill: scoreGaugeColor }], [scoreGaugeValue, scoreGaugeColor]);

    const hourlyBehaviorData = useMemo(() => {
        if (!Array.isArray(hourlyMetrics)) return [];
        return hourlyMetrics
            .map((h) => {
                const hour = Number(h?.hour);
                if (!Number.isFinite(hour)) return null;
                return {
                    hour,
                        label: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2000, 0, 1, hour, 0, 0)),
                    productive: Number(h?.productive) || 0,
                    unproductive: Number(h?.unproductive) || 0,
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.hour - b.hour);
    }, [hourlyMetrics]);

    const topDistractionRows = useMemo(() => {
        const base = Array.isArray(aiReport?.topDistractions) ? aiReport.topDistractions : [];
        const top3 = base.slice(0, 3);
        const max = Math.max(1, ...top3.map((x) => Number(x?.wastedSeconds) || 0));
        return top3.map((row) => {
            const seconds = Number(row?.wastedSeconds) || 0;
            const host = String(row?.site || "").trim().replace(/^https?:\/\//, "").split("/")[0];
            return {
                site: row?.site || "Site",
                host,
                seconds,
                pretty: formatTrackedShort(seconds),
                pct: Math.round((seconds / max) * 100),
            };
        });
    }, [aiReport]);

    const weekScores = useMemo(() => {
        const prev = Number(weekComparison?.previous?.scoreSafe ?? weekComparison?.previous?.score);
        const cur = Number(weekComparison?.current?.scoreSafe ?? weekComparison?.current?.score);
        return {
            previous: Number.isFinite(prev) ? prev : null,
            current: Number.isFinite(cur) ? cur : null,
        };
    }, [weekComparison]);

    const predictedScore = useMemo(() => {
        if (!Number.isFinite(weekScores.current) || !Number.isFinite(weekScores.previous)) return null;
        const latestLoad = Number(cognitiveMetrics?.[cognitiveMetrics.length - 1]?.loadScore);
        const cognitivePenalty = !Number.isFinite(latestLoad) ? 1 : latestLoad > 7 ? 1.15 : latestLoad < 4 ? 0.85 : 1;
        const delta = (weekScores.current - weekScores.previous) * 0.6;
        const raw = weekScores.current + delta * cognitivePenalty;
        return Math.min(100, Math.max(0, Math.round(raw)));
    }, [weekScores, cognitiveMetrics]);

    const weeklyChartData = useMemo(
        () =>
            [
                { name: "Last week", score: weekScores.previous ?? 0 },
                { name: "This week", score: weekScores.current ?? 0 },
            ].filter((x) => x.score > 0 || (weekScores.previous != null && weekScores.current != null)),
        [weekScores]
    );

    const weeklyDelta = useMemo(() => {
        if (!Number.isFinite(weekScores.previous) || !Number.isFinite(weekScores.current)) return null;
        const prev = Number(weekScores.previous);
        const cur = Number(weekScores.current);
        const delta = cur - prev;
        const pct = prev > 0 ? Math.round((Math.abs(delta) / prev) * 100) : 0;
        return { delta, pct };
    }, [weekScores]);

    const predictiveChartData = useMemo(() => {
        if (!Number.isFinite(weekScores.previous) || !Number.isFinite(weekScores.current) || !Number.isFinite(predictedScore)) return [];
        return [
            { point: "Last week", scoreActual: weekScores.previous, scoreForecast: null },
            { point: "This week", scoreActual: weekScores.current, scoreForecast: weekScores.current },
            { point: "Next week", scoreActual: null, scoreForecast: predictedScore },
        ];
    }, [weekScores, predictedScore]);

    const predictionSignal = useMemo(() => {
        if (!Number.isFinite(weekScores.current) || !Number.isFinite(predictedScore)) {
            return { label: "Not enough data for forecast yet", type: "neutral", delta: 0 };
        }
        const delta = predictedScore - weekScores.current;
        if (Math.abs(delta) < 1) {
            return { label: "Pattern looks steady for next week", type: "neutral", delta: 0 };
        }
        if (delta > 0) {
            return {
                label: `Model expects improvement of about ${Math.round(delta)} pts`,
                type: "growth",
                delta,
            };
        }
        return {
            label: `Model flags a potential drop of about ${Math.abs(Math.round(delta))} pts`,
            type: "risk",
            delta,
        };
    }, [weekScores, predictedScore]);

    const primaryGoalProgress = useMemo(() => {
        const g = aiReport?.primaryGoal;
        if (!g) return null;
        const current = Number(g.currentSeconds) || 0;
        const target = Number(g.targetSeconds) || 0;
        const pct = target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : Number(g.progress) || 0;
        return {
            label: String(g.label || g.website || (g.type === "productive" ? "Productive goal" : "Limit goal")),
            current,
            target,
            pct,
        };
    }, [aiReport]);

    const coachProductivity = useMemo(
        () => coachProductivityScore({ metrics, yesterdayMetrics, scoreDeltaVsYesterday, firstName, aiReport }),
        [metrics, yesterdayMetrics, scoreDeltaVsYesterday, firstName, aiReport]
    );
    const coachBehavioral = useMemo(
        () => coachBehavioralPatterns({ cognitiveMetrics, insightsData, hourlyMetrics }),
        [cognitiveMetrics, insightsData, hourlyMetrics]
    );
    const coachDistraction = useMemo(
        () =>
            coachDistractionAlerts({
                metrics,
                todaySites: Array.isArray(todayWebsites) ? todayWebsites : [],
                aiReport,
            }),
        [metrics, todayWebsites, aiReport]
    );
    const coachPersonalized = useMemo(
        () => coachPersonalizedSuggestions({ milestone, metrics, aiReport, focusSessionMinutes }),
        [milestone, metrics, aiReport, focusSessionMinutes]
    );
    const coachWeekly = useMemo(
        () => coachWeeklyReport({ weekStats, weeklyDelta, weekComparison }),
        [weekStats, weeklyDelta, weekComparison]
    );
    const coachPredictive = useMemo(
        () =>
            coachPredictiveAnalytics({
                peakMeta,
                tomorrowPlanCopy,
                scoreDeltaVsYesterday,
                metrics,
                predictionSignal,
                predictedScore,
                weekScores,
            }),
        [
            peakMeta,
            tomorrowPlanCopy,
            scoreDeltaVsYesterday,
            metrics,
            predictionSignal,
            predictedScore,
            weekScores,
        ]
    );
    const coachGoal = useMemo(() => coachGoalBasedInsights({ goals, aiReport }), [goals, aiReport]);

    const toastBreak = () =>
        requestExtensionWorkspaceToast({
            title: "Time for a screen break",
            message: "Step away for a few minutes—your load signal was elevated.",
            variant: "info",
            systemNotify: true,
        });

    const getRecommendations = useCallback(() => {
        const recs = [];
        const prod = Number(metrics?.productiveTime);
        const unprod = Number(metrics?.unproductiveTime);

        const peakProdWindow = aiReport?.peakProdWindow;
        const peakDistractionWindow = aiReport?.peakDistractionWindow;
        const topDistractions = Array.isArray(aiReport?.topDistractions) ? aiReport.topDistractions : [];
        const topSite = topDistractions[0]?.site;
        const topSiteWasted = Number(topDistractions[0]?.wastedSeconds) || 0;

        const primaryGoal = aiReport?.primaryGoal;

        if (latestLoad > 7) {
            recs.push({
                key: "overload",
                title: "Time for a break",
                desc: `Your latest hour shows high cognitive load. Step away for 10–15 minutes, then resume in ${peakProdWindow || "your next focus window"}.`,
                icon: <Zap className="text-red-400" />,
                type: "warning",
                actions: [
                    { label: "Break timer", tab: "timer", icon: Timer },
                    { label: "Nudge me", onClick: toastBreak },
                ],
            });
        }

        const prodScore = Number(aiReport?.productivityScore);
        if (Number.isFinite(prodScore) && prodScore >= 70 && peakProdWindow) {
            recs.push({
                key: "peak_focus",
                title: `Protect ${peakProdWindow}`,
                desc: `Your productivity is strongest here. Start a ${focusSessionMinutes}-minute focus block and avoid switching until the timer ends.`,
                icon: <Sparkles className="text-primary" />,
                type: "success",
                actions: [
                    { label: "Focus mode", tab: "focus", icon: Focus },
                    { label: "Timer", tab: "timer", icon: Timer },
                ],
            });
        }

        if (topSite && peakDistractionWindow) {
            const wastedPretty = formatTrackedShort(topSiteWasted);
            recs.push({
                key: "cut_distraction",
                title: `Cut ${topSite} during ${peakDistractionWindow}`,
                desc: `Today, ${topSite} is your #1 distraction (${wastedPretty}). Put it on hold during your next peak-distraction window.`,
                icon: <Activity className="text-orange-400" />,
                type: "info",
                actions: [
                    { label: "Focus mode", tab: "focus", icon: Focus },
                    { label: "Manage goals", tab: "goals", icon: Target },
                ],
            });
        } else if (Number.isFinite(prod) && Number.isFinite(unprod) && unprod > prod) {
            recs.push({
                key: "distraction",
                title: "More distraction than work",
                desc: `Distractions outweigh productive time right now. A short focus block can reset the day—start with a ${focusSessionMinutes}-minute timer.`,
                icon: <Activity className="text-orange-400" />,
                type: "info",
                actions: [
                    { label: "Goals", tab: "goals", icon: Target },
                    { label: "Focus mode", tab: "focus", icon: Focus },
                ],
            });
        }

        if (primaryGoal) {
            const goalLabel = String(primaryGoal.label || primaryGoal.website || "your goal").trim();
            const goalType = primaryGoal.type;
            const met = Boolean(primaryGoal.metToday);
            const completion = Math.min(100, Math.max(0, Number(primaryGoal.progress) || 0));

            if ((goalType === "productive" && !met) || (goalType === "unproductive" && !met)) {
                recs.push({
                    key: "goal_nudge",
                    title: `Catch up: ${goalLabel}`,
                    desc:
                        goalType === "productive"
                            ? `You're at ${completion}% of your productive target. Your next move: do one ${focusSessionMinutes}-minute block in ${peakProdWindow || "your peak hours"}.`
                            : `You're above your limit for this objective. Use ${peakDistractionWindow || "distraction peaks"} as your trigger to switch into Focus mode early.`,
                    icon: <Target className="text-secondary" />,
                    type: "neutral",
                    actions: [
                        { label: "Goals", tab: "goals", icon: Target },
                        { label: "Timer", tab: "timer", icon: Timer },
                    ],
                });
            }
        }

        if (recs.length < 4) {
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
        }

        return recs;
    }, [metrics, aiReport, latestLoad, focusSessionMinutes, peakWindowCopy]);

    const downloadWeeklyReport = useCallback(() => {
        void (async () => {
            const { downloadWeeklyInsightsPdf } = await import("@/lib/weeklyInsightsPdf");
            await downloadWeeklyInsightsPdf({
                userName: user?.name,
                weeklySummary: aiReport?.weeklySummary || "",
                predictiveAnalytics: aiReport?.predictiveAnalytics || "",
                currentWeek: weekComparison?.current || null,
                previousWeek: weekComparison?.previous || null,
            });
        })();
    }, [aiReport, weekComparison, user?.name]);

    const goTab = (tab) => setActiveTab(tab);

    return {
        user,
        loading,
        synchronizeInsights,
        metrics,
        weekComparison,
        peakMeta,
        aiReport,
        scoreGaugeValue,
        scoreGaugeColor,
        scoreGaugeData,
        hourlyBehaviorData,
        topDistractionRows,
        weeklyChartData,
        weeklyDelta,
        predictiveChartData,
        predictionSignal,
        primaryGoalProgress,
        downloadWeeklyReport,
        goTab,
        getRecommendations,
        focusSessionMinutes,
        coachProductivity,
        coachBehavioral,
        coachDistraction,
        coachPersonalized,
        coachWeekly,
        coachPredictive,
        coachGoal,
    };
}
