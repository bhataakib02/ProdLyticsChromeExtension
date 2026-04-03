"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FaviconImage } from "@/components/common/FaviconImage";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Sparkles,
    Activity,
    Zap,
    TrendingUp,
    Calendar,
    Target,
    Lightbulb,
    ArrowUpRight,
    ArrowDownRight,
    FileDown,
    FileText,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    CartesianGrid,
    RadialBarChart,
    RadialBar,
    PolarAngleAxis,
} from "recharts";
import { formatTrackedShort } from "@/hooks/useAiCoachInsightsData";
import { AI_COACH_FEATURES } from "@/lib/aiCoachRoutes";
import InsightCoachCard from "@/components/insights/InsightCoachCard";

export function AiCoachFeaturePanels({ feature, data }) {
    const {
        loading,
        aiReport,
        scoreGaugeValue,
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
        coachProductivity,
        coachBehavioral,
        coachDistraction,
        coachPersonalized,
        coachWeekly,
        coachPredictive,
        coachGoal,
    } = data;

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const panels = {
        "smart-productivity-score": (
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.015] p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between gap-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/65 flex items-center gap-2">
                        <Sparkles size={14} className="text-primary" />
                        1. Smart Productivity Score
                    </h4>
                    <div className="text-3xl font-black text-foreground tabular-nums">{scoreGaugeValue}/100</div>
                </div>
                <div className="mt-4 flex items-center gap-5">
                    <div className="relative h-28 w-28 shrink-0">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart data={scoreGaugeData} innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270}>
                                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                <RadialBar dataKey="value" cornerRadius={12} background clockWise />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 grid place-items-center">
                            <div className="h-16 w-16 rounded-full bg-[#2f3444] grid place-items-center text-sm font-black text-foreground border border-white/10">
                                {scoreGaugeValue}%
                            </div>
                        </div>
                    </div>
                    <p className="text-[15px] text-foreground/80 font-medium leading-relaxed">{aiReport?.productivityExplanation || ""}</p>
                </div>
            </article>
        ),
        "behavioral-patterns": (
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/65 flex items-center gap-2">
                    <Activity size={14} className="text-secondary" />
                    2. Behavioral pattern detection
                </h4>
                <div className="mt-3 h-52">
                    {mounted && hourlyBehaviorData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyBehaviorData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                                <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                                <Tooltip
                                    formatter={(value, name) => [formatTrackedShort(Number(value) * 60), name]}
                                    labelFormatter={(label) => `Hour: ${label}`}
                                />
                                <Bar dataKey="productive" fill="var(--color-primary)" name="Productive" radius={[6, 6, 0, 0]} stackId="usage" />
                                <Bar dataKey="unproductive" fill="var(--color-danger)" name="Distracting" radius={[6, 6, 0, 0]} stackId="usage" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full grid place-items-center text-xs text-muted font-medium">Not enough hourly data yet.</div>
                    )}
                </div>
                <p className="mt-2 text-[15px] text-foreground/80 font-medium leading-relaxed">{aiReport?.behavioralPatternSentence || ""}</p>
                {!loading ? (
                    <InsightCoachCard
                        insight={coachBehavioral?.insight}
                        recommendations={coachBehavioral?.recommendations}
                        className="mt-5 border-t border-white/10 pt-5"
                    />
                ) : null}
            </article>
        ),
        "distraction-alerts": (
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/65 flex items-center gap-2">
                    <Zap size={14} className="text-danger" />
                    3. Distraction alerts
                </h4>
                <div className="mt-4 space-y-3">
                    {topDistractionRows.length > 0 ? (
                        topDistractionRows.map((row) => (
                            <div key={row.site}>
                                <div className="flex items-center justify-between text-sm font-bold text-foreground/85 mb-1">
                                    <span className="truncate inline-flex items-center gap-2">
                                        <FaviconImage
                                            domain={row.host || row.site}
                                            size={16}
                                            className="w-4 h-4"
                                        />
                                        {row.site}
                                    </span>
                                    <span>{row.pretty}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full bg-danger" style={{ width: `${row.pct}%` }} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted font-medium">No major distraction sites found yet.</p>
                    )}
                </div>
                <p className="mt-3 text-[15px] text-foreground/80 font-medium leading-relaxed">{aiReport?.topDistractionAlerts || ""}</p>
                {!loading ? (
                    <InsightCoachCard
                        insight={coachDistraction?.insight}
                        recommendations={coachDistraction?.recommendations}
                        className="mt-5 border-t border-white/10 pt-5"
                    />
                ) : null}
            </article>
        ),
        "personalized-suggestions": (
            <article className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-white/[0.01] p-4 md:p-5 shadow-[0_10px_30px_rgba(37,99,235,0.15)]">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80 flex items-center gap-2">
                    <Lightbulb size={14} className="text-primary" />
                    4. Personalized suggestions
                </h4>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getRecommendations()
                        .slice(0, 4)
                        .map((rec) => (
                            <motion.div
                                key={rec.key}
                                whileHover={{ y: -2, scale: 1.01 }}
                                transition={{ duration: 0.18 }}
                                className={`rounded-xl border p-3 ${
                                    rec.type === "warning"
                                        ? "border-danger/30 bg-danger/10"
                                        : rec.type === "success"
                                          ? "border-success/30 bg-success/10"
                                          : rec.type === "info"
                                            ? "border-primary/30 bg-primary/10"
                                            : "border-white/10 bg-background/20"
                                }`}
                            >
                                <div className="flex items-center gap-2 text-foreground/90 font-black text-xs">
                                    {rec.icon}
                                    <span>{rec.title}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted font-medium leading-relaxed">{rec.desc}</p>
                            </motion.div>
                        ))}
                </div>
                {!loading ? (
                    <InsightCoachCard
                        insight={coachPersonalized?.insight}
                        recommendations={coachPersonalized?.recommendations}
                        className="mt-5 border-t border-primary/20 pt-5"
                    />
                ) : null}
            </article>
        ),
        "weekly-report": (
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/65 flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        5. Weekly report generator
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => goTab("analytics")}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/80 hover:bg-white/10 inline-flex items-center gap-1.5"
                        >
                            <FileText size={12} />
                            View report
                        </button>
                        <button
                            type="button"
                            onClick={downloadWeeklyReport}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/80 hover:bg-white/10 inline-flex items-center gap-1.5"
                        >
                            <FileDown size={12} />
                            Download report
                        </button>
                    </div>
                </div>
                <div className="mt-3 h-44">
                    {mounted && weeklyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                                <Tooltip formatter={(v) => [`${v}%`, "Focus score"]} />
                                <Bar dataKey="score" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full grid place-items-center text-xs text-muted font-medium">Need two tracked weeks for comparison.</div>
                    )}
                </div>
                {weeklyDelta ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold">
                        {weeklyDelta.delta >= 0 ? (
                            <ArrowUpRight size={14} className="text-success" />
                        ) : (
                            <ArrowDownRight size={14} className="text-danger" />
                        )}
                        <span className={weeklyDelta.delta >= 0 ? "text-success" : "text-danger"}>
                            {weeklyDelta.delta >= 0 ? "+" : "-"}
                            {weeklyDelta.pct}% vs last week
                        </span>
                    </p>
                ) : null}
                <p className="mt-2 text-[15px] text-foreground/80 font-medium leading-relaxed">{aiReport?.weeklySummary || ""}</p>
                {!loading ? (
                    <InsightCoachCard
                        insight={coachWeekly?.insight}
                        recommendations={coachWeekly?.recommendations}
                        className="mt-5 border-t border-white/10 pt-5"
                    />
                ) : null}
            </article>
        ),
        "predictive-analytics": (
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/65 flex items-center gap-2">
                    <TrendingUp size={14} className="text-secondary" />
                    6. Predictive analytics
                </h4>
                <div className="mt-3 h-44">
                    {mounted && predictiveChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={predictiveChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                                <XAxis dataKey="point" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} />
                                <Tooltip
                                    formatter={(v, name) => {
                                        if (v == null || Number.isNaN(Number(v))) return null;
                                        return [`${Math.round(Number(v))}%`, name === "scoreActual" ? "Actual" : "Forecast"];
                                    }}
                                    contentStyle={{
                                        backgroundColor: "rgba(16, 20, 30, 0.95)",
                                        border: "1px solid rgba(255,255,255,0.15)",
                                        borderRadius: "10px",
                                        color: "#e5e7eb",
                                    }}
                                    labelStyle={{ color: "#cbd5e1", fontWeight: 700 }}
                                    itemStyle={{ color: "#e5e7eb" }}
                                />
                                <Line type="monotone" dataKey="scoreActual" stroke="var(--color-success)" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
                                <Line type="monotone" dataKey="scoreForecast" stroke="var(--color-secondary)" strokeDasharray="6 6" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full grid place-items-center text-xs text-muted font-medium">Forecast needs weekly trend data.</div>
                    )}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-2.5 py-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 font-black text-secondary uppercase tracking-wide">
                            <Sparkles size={14} />
                            <span>Prediction</span>
                        </div>
                        <p className="mt-1 text-foreground/80 font-bold leading-snug">{predictionSignal.label}</p>
                    </div>
                    <div className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 font-black text-danger uppercase tracking-wide">
                            <ArrowDownRight size={14} />
                            <span>Risk indicator</span>
                        </div>
                        <p className="mt-1 text-foreground/80 font-bold leading-snug">
                            {predictionSignal.type === "risk"
                                ? `Decline risk: ${Math.abs(Math.round(predictionSignal.delta))} pts`
                                : "No significant decline signal"}
                        </p>
                    </div>
                    <div className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-2 text-xs">
                        <div className="inline-flex items-center gap-1.5 font-black text-success uppercase tracking-wide">
                            <ArrowUpRight size={14} />
                            <span>Growth indicator</span>
                        </div>
                        <p className="mt-1 text-foreground/80 font-bold leading-snug">
                            {predictionSignal.type === "growth"
                                ? `Growth potential: +${Math.round(predictionSignal.delta)} pts`
                                : "No significant growth signal"}
                        </p>
                    </div>
                </div>
                <p className="mt-2 text-[15px] text-foreground/80 font-medium leading-relaxed">{aiReport?.predictiveAnalytics || ""}</p>
                {!loading ? (
                    <InsightCoachCard
                        insight={coachPredictive?.insight}
                        recommendations={coachPredictive?.recommendations}
                        className="mt-5 border-t border-white/10 pt-5"
                    />
                ) : null}
            </article>
        ),
        "goal-insights": (
            <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-4 md:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/65 flex items-center gap-2">
                    <Target size={14} className="text-secondary" />
                    7. Goal-based insights
                </h4>
                {primaryGoalProgress ? (
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-sm font-bold text-foreground/90 mb-1">
                            <span className="truncate">{primaryGoalProgress.label}</span>
                            <span>{primaryGoalProgress.pct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-secondary" style={{ width: `${primaryGoalProgress.pct}%` }} />
                        </div>
                        <div className="mt-2 text-xs text-muted font-medium">
                            {formatTrackedShort(primaryGoalProgress.current)} / {formatTrackedShort(primaryGoalProgress.target)}
                        </div>
                        <div className="mt-2 text-xs font-bold inline-flex items-center gap-1.5">
                            {primaryGoalProgress.pct >= 100 ? (
                                <>
                                    <CheckCircle2 size={14} className="text-success" />
                                    <span className="text-success">Goal completed</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={14} className="text-orange-400" />
                                    <span className="text-orange-400">Off-track: reduce distractions in your peak hours</span>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <p className="mt-3 text-xs text-muted font-medium">No active goal found.</p>
                )}
                <p className="mt-3 text-[15px] text-foreground/80 font-medium leading-relaxed">{aiReport?.goalBasedInsights || ""}</p>
                {!loading ? (
                    <InsightCoachCard
                        insight={coachGoal?.insight}
                        recommendations={coachGoal?.recommendations}
                        className="mt-5 border-t border-white/10 pt-5"
                    />
                ) : null}
            </article>
        ),
    };

    const node = panels[feature];
    if (!node) return <p className="text-sm text-muted text-center py-10 font-bold uppercase tracking-widest opacity-40">Unknown feature.</p>;
    return <div className="max-w-3xl mx-auto">{loading ? <p className="text-sm text-muted animate-pulse">Loading…</p> : node}</div>;
}

export function AiCoachHubLinks() {
    return (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {AI_COACH_FEATURES.map((f) => (
                <li key={f.slug}>
                    <Link
                        href={`/insights/ai-coach/${f.slug}`}
                        className="flex min-h-[4.25rem] items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-foreground/[0.02] px-5 py-4 text-left shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-colors hover:border-primary/35 hover:bg-primary/[0.06]"
                    >
                        <span className="text-sm font-bold leading-snug text-foreground/95">{f.title}</span>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-muted">Open</span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
