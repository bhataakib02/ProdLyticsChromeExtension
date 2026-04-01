"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { matchesActivitySearch } from "@/lib/activitySearch";
import { trackingService } from "@/services/tracking.service";
import {
    BarChart3,
    PieChart,
    Clock,
    TrendingUp,
    ExternalLink,
    Globe,
    Zap,
    Target,
    Activity,
    Calendar,
    MousePointer2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart as RePieChart,
    Pie
} from "recharts";

export default function AnalyticsView() {
    const { user } = useAuth();
    const { activitySearchQuery } = useDashboard();
    const [range, setRange] = useState("today");
    const [domains, setDomains] = useState([]);
    const [distribution, setDistribution] = useState([]);
    const [hourly, setHourly] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [metrics, setMetrics] = useState({ score: 0, productive: 0, unproductive: 0, neutral: 0, total: 0 });

    useEffect(() => {
        if (!user) return;
        const ac = new AbortController();
        const req = { signal: ac.signal };

        (async () => {
            setLoading(true);
            try {
                const [domainData, metricsData, hourlyData] = await Promise.all([
                    trackingService.getMetrics(range, req),
                    trackingService.getScore(range, req),
                    trackingService.getHourlyMetrics(range, req),
                ]);

                if (ac.signal.aborted) return;

                setDomains(domainData);
                setMetrics(metricsData);

                const distData = [
                    { name: "Productive", value: metricsData.productive, color: "var(--color-success)", glow: "rgba(16, 185, 129, 0.4)" },
                    { name: "Neutral", value: metricsData.neutral, color: "var(--color-muted)", glow: "rgba(156, 163, 175, 0.2)" },
                    { name: "Unproductive", value: metricsData.unproductive, color: "var(--color-danger)", glow: "rgba(239, 68, 68, 0.4)" }
                ].filter(d => d.value > 0);
                setDistribution(distData);

                // API returns per-category totals already in minutes (seconds summed, then /60).
                const hourlyChartData = (Array.isArray(hourlyData) ? hourlyData : []).map((h) => ({
                    hour: h.hour,
                    display: `${h.hour}:00`,
                    total: Math.round(
                        (Number(h.productive) || 0) + (Number(h.unproductive) || 0) + (Number(h.neutral) || 0)
                    ),
                }));
                setHourly(hourlyChartData);
            } catch (err) {
                const aborted =
                    ac.signal.aborted ||
                    err?.code === "ERR_CANCELED" ||
                    axios.isCancel?.(err) ||
                    err?.name === "CanceledError";
                if (aborted) return;
                console.error("Error fetching analytics data:", err);
            } finally {
                if (!ac.signal.aborted) setLoading(false);
            }
        })();

        return () => ac.abort();
    }, [user, range]);

    function formatTime(seconds) {
        if (!seconds || seconds <= 0) return "0s";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        let result = "";
        if (h > 0) result += `${h}h `;
        if (m > 0 || h > 0) result += `${m}m `;
        result += `${s}s`;
        return result.trim();
    }

    if (!user) return null;

    const filteredDomains = domains
        .filter((domain) => categoryFilter === "all" || domain.category === categoryFilter)
        .filter((domain) => matchesActivitySearch(activitySearchQuery, domain._id))
        .slice(0, 20);

    const maxTime = filteredDomains.length > 0 ? filteredDomains[0].totalTime : 1;
    const rangeLabels = { today: "Today", week: "This Week", month: "This Month" };

    return (
        <div className="p-8 space-y-10 max-w-7xl mx-auto">
            {/* Header */}
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-foreground via-foreground to-foreground/45 bg-clip-text text-transparent">
                        Analytics
                    </h1>
                    <p className="text-muted mt-3 font-medium tracking-wide flex items-center gap-2">
                        <Calendar size={14} />
                        Insights for <span className="text-primary font-bold">{rangeLabels[range]}</span>
                    </p>
                </div>

                <div className="flex items-center gap-1 rounded-2xl border-2 border-ui bg-foreground/5 p-1.5 backdrop-blur-xl">
                    {["today", "week", "month"].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-8 py-3 rounded-xl text-sm font-black transition-all duration-500 relative overflow-hidden group ${range === r ? "text-background" : "text-muted hover:text-foreground"
                                }`}
                        >
                            {range === r && (
                                <motion.div
                                    layoutId="range-bg"
                                    className="absolute inset-0 bg-primary shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <PremiumStatCard
                    icon={<Clock size={22} />}
                    label="Screen Time"
                    value={formatTime(metrics.total)}
                    subLabel="Total Active"
                    color="primary"
                    loading={loading}
                />
                <PremiumStatCard
                    icon={<Zap size={22} />}
                    label="Productive"
                    value={formatTime(metrics.productive)}
                    subLabel="Deep Work"
                    color="success"
                    loading={loading}
                />
                <PremiumStatCard
                    icon={<Globe size={22} />}
                    label="Domains Active"
                    value={
                        activitySearchQuery.trim()
                            ? `${filteredDomains.length}/${domains.length}`
                            : String(domains.length)
                    }
                    subLabel={activitySearchQuery.trim() ? "Matching / total" : "Total Active"}
                    color="warning"
                    loading={loading}
                />
                <PremiumStatCard
                    icon={<Target size={22} />}
                    label="Efficiency"
                    value={`${metrics.score}%`}
                    subLabel="Focus Score"
                    color="secondary"
                    loading={loading}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card group relative min-w-0 overflow-hidden p-8 lg:col-span-2"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-wider">Hourly Pulse</h2>
                                <p className="text-xs text-muted/60 font-medium">Activity levels throughout the day</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative h-72 min-h-72 w-full min-w-0">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted/40 animate-pulse font-black uppercase tracking-widest text-xs">Analyzing Data...</div>
                        ) : !hourly.some((h) => h.total > 0) ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted/50 text-sm">No activity recorded for this period</div>
                        ) : (
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                                minWidth={0}
                                minHeight={288}
                                debounce={50}
                                initialDimension={{ width: 640, height: 288 }}
                            >
                                <BarChart data={hourly} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1} />
                                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="1 4"
                                        stroke="var(--chart-grid-stroke)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="display"
                                        tick={{ fill: "var(--chart-axis-tick)", fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                        interval={2}
                                        dy={10}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: "var(--chart-cursor)" }}
                                        contentStyle={{
                                            backgroundColor: "var(--chart-tooltip-bg)",
                                            border: "1px solid var(--chart-tooltip-border)",
                                            borderRadius: "16px",
                                            padding: "16px",
                                            boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
                                        }}
                                        labelStyle={{
                                            color: "var(--chart-tooltip-label)",
                                            fontWeight: "bold",
                                            marginBottom: "8px",
                                        }}
                                        itemStyle={{ color: "var(--chart-tooltip-item)" }}
                                        formatter={(v) => [`${v} mins`, "Activity"]}
                                    />
                                    <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="url(#barGradient)" minPointSize={4}>
                                        {hourly.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    entry.total > 40
                                                        ? "var(--color-primary)"
                                                        : entry.total > 15
                                                          ? "var(--chart-bar-mid)"
                                                          : "var(--chart-bar-dim)"
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card group relative flex min-w-0 flex-col p-8"
                >
                    <div className="flex items-center gap-4 mb-10 w-full">
                        <div className="p-3 bg-secondary/20 rounded-2xl text-secondary shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                            <PieChart size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-wider">Split</h2>
                            <p className="text-xs text-muted/60 font-medium">Usage Allocation</p>
                        </div>
                    </div>
                    <div className="relative mb-8 flex h-56 min-h-56 w-full min-w-0 items-center justify-center">
                        {distribution.length > 0 ? (
                            <>
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    minWidth={0}
                                    minHeight={224}
                                    debounce={50}
                                    initialDimension={{ width: 360, height: 224 }}
                                >
                                    <RePieChart>
                                        <Pie
                                            data={distribution}
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="var(--chart-pie-stroke)"
                                            strokeWidth={1}
                                            animationDuration={1500}
                                        >
                                            {distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--chart-tooltip-bg)",
                                                border: "1px solid var(--chart-tooltip-border)",
                                                borderRadius: "12px",
                                                padding: "10px",
                                            }}
                                            labelStyle={{ color: "var(--chart-tooltip-label)" }}
                                            itemStyle={{ color: "var(--chart-tooltip-item)" }}
                                            formatter={(v) => [`${formatTime(v)}`, "Time"]}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                                    <span className="text-4xl font-black text-foreground">{metrics.score}%</span>
                                    <span className="text-[10px] text-muted uppercase font-black tracking-widest mt-1">Focus</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-muted/40 font-bold uppercase tracking-widest text-xs italic">Awaiting Activity</div>
                        )}
                    </div>
                    <div className="mt-auto space-y-4 border-t-ui pt-6">
                        {distribution.map((item) => (
                            <div key={item.name} className="flex items-center justify-between group/legend">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm font-bold text-muted transition-colors group-hover/legend:text-foreground">{item.name}</span>
                                </div>
                                <span className="text-sm font-black font-mono">{formatTime(item.value)}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Platform Leaderboard */}
            <div className="glass-card relative overflow-hidden">
                <div className="flex flex-col items-start justify-between gap-6 border-b-ui bg-foreground/[0.03] p-8 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-foreground/5 p-3 text-foreground/85">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Website Activity</h2>
                            <p className="text-xs text-muted/60 font-medium mt-1">Top platforms used</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl border-2 border-ui bg-foreground/10 p-1.5">
                        {["all", "productive", "neutral", "unproductive"].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`flex items-center gap-2 rounded-xl border-2 px-5 py-2 text-[11px] font-black capitalize transition-all ${categoryFilter === cat ? "border-ui-strong bg-foreground/10 text-foreground" : "border-transparent text-muted hover:border-ui-muted hover:text-foreground"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="p-24 text-center">Analyzing Data...</div>
                ) : filteredDomains.length === 0 ? (
                    <div className="p-16 text-center text-sm text-muted">
                        {activitySearchQuery.trim()
                            ? "No sites match your search for this range and filter."
                            : "No activity recorded for this period."}
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {filteredDomains.map((domain, index) => {
                            const percentage = maxTime > 0 ? Math.round((domain.totalTime / maxTime) * 100) : 0;
                            const favHost = String(domain._id || "").split(" · ")[0].trim() || domain._id;
                            return (
                                <motion.div
                                    key={domain._id}
                                    layout
                                    className="group flex items-center gap-6 rounded-2xl border-2 border-ui bg-foreground/[0.02] px-6 py-4 hover:bg-foreground/[0.06]"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/10 text-[10px] font-bold text-muted group-hover:text-primary">
                                        {String(index + 1).padStart(2, "0")}
                                    </div>
                                    <div className="flex items-center gap-4 min-w-[220px] w-[300px]">
                                        <Image
                                            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(favHost)}&sz=64`}
                                            alt=""
                                            width={24}
                                            height={24}
                                            className="w-6 h-6 rounded-md"
                                            unoptimized
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground/90">{domain._id}</span>
                                            <span className="mt-1 w-fit rounded-md border-2 border-ui-muted px-2 py-0.5 text-[8px] font-black uppercase">
                                                {domain.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 hidden md:flex items-center gap-8">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-ui-muted bg-foreground/15">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-primary" />
                                        </div>
                                        <div className="min-w-[120px] text-right">
                                            <span className="font-mono text-sm font-black text-foreground/90">{formatTime(domain.totalTime)}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}

function PremiumStatCard({ icon, label, value, subLabel, color, loading }) {
    const colorClasses = {
        primary: "bg-primary/10 text-primary border-primary/20",
        success: "bg-success/10 text-success border-success/20",
        warning: "bg-warning/10 text-warning border-warning/20",
        secondary: "bg-secondary/10 text-secondary border-secondary/20"
    };

    return (
        <div className="glass-card group relative cursor-default p-6">
            <div className="flex flex-col gap-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest block mb-1">{label}</span>
                    {loading ? <div className="h-8 w-24 animate-pulse rounded-lg bg-foreground/5" /> : <span className="text-3xl font-black text-foreground">{value}</span>}
                    <span className="text-[10px] text-muted/40 font-bold uppercase tracking-widest mt-2 block">● {subLabel}</span>
                </div>
            </div>
        </div>
    );
}
