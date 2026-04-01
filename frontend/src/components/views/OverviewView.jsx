"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { matchesActivitySearch } from "@/lib/activitySearch";
import { trackingService } from "@/services/tracking.service";
import { goalsService, goalsProgressTodayList } from "@/services/goals.service";
import {
    Activity,
    TrendingUp,
    Clock,
    Target,
    Zap,
    FileDown,
    PieChart,
    MousePointer2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart as RePieChart, Pie, ResponsiveContainer, Cell, Tooltip } from "recharts";
import Image from "next/image";

function faviconHostFromTrackingId(id) {
    const s = String(id || "").trim();
    if (!s) return "";
    const i = s.indexOf(" · ");
    return i === -1 ? s : s.slice(0, i).trim();
}

export default function OverviewView({ onTabChange }) {
    const { user } = useAuth();
    const { activitySearchQuery } = useDashboard();
    const [metrics, setMetrics] = useState({ score: 0, totalTime: 0, productiveTime: 0, unproductiveTime: 0, neutralTime: 0, streak: 0, peakHour: null });
    const [objectives, setObjectives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topDomains, setTopDomains] = useState([]);
    const [pdfExporting, setPdfExporting] = useState(false);

    useEffect(() => {
        if (user) {
            synchronizeOverview();
        }
    }, [user]);

    async function synchronizeOverview() {
        setLoading(true);
        try {
            const [metricsData, objectivesData, domainsData] = await Promise.allSettled([
                trackingService.getSummary(),
                goalsService.getObjectives(),
                trackingService.getMetrics("today")
            ]);

            if (metricsData.status === "fulfilled" && metricsData.value && !metricsData.value.error) {
                setMetrics(prev => ({ ...prev, ...metricsData.value }));
            }
            if (objectivesData.status === "fulfilled" && objectivesData.value) {
                setObjectives(goalsProgressTodayList(objectivesData.value));
            }
            if (domainsData.status === "fulfilled" && Array.isArray(domainsData.value)) {
                setTopDomains(domainsData.value);
            }
        } catch (err) {
            console.error("error fetching overview data:", err);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(seconds) {
        if (!seconds || seconds <= 0) return "0s";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        let res = "";
        if (h > 0) res += `${h}h `;
        if (m > 0 || h > 0) res += `${m}m `;
        res += `${s}s`;
        return res.trim();
    }

    async function handleExportPdf() {
        if (pdfExporting || loading) return;
        setPdfExporting(true);
        try {
            const { downloadOverviewPdf } = await import("@/lib/overviewPdf");
            await downloadOverviewPdf({
                userName: user?.name,
                metrics,
                objectives,
                topDomains,
                formatTime,
            });
        } catch (e) {
            console.error("PDF export failed:", e);
        } finally {
            window.setTimeout(() => setPdfExporting(false), 500);
        }
    }

    if (!user) return null;

    const domainMatches = (d) => matchesActivitySearch(activitySearchQuery, d._id);

    const distribution = [
        { name: "Productive", value: metrics.productiveTime || 0, color: "var(--color-success)" },
        { name: "Neutral", value: metrics.neutralTime || 0, color: "var(--color-muted)" },
        { name: "Unproductive", value: metrics.unproductiveTime || 0, color: "var(--color-danger)" }
    ].filter(d => d.value > 0);

    return (
        <div className="p-8 space-y-10 max-w-7xl mx-auto">
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/55 bg-clip-text text-transparent">
                        Welcome back, {user?.name.split(' ')[0]}
                    </h1>
                    <p className="text-muted mt-3 font-medium tracking-wide flex items-center gap-2">
                        <Activity size={14} className="text-primary" /> ProdLytics AI is monitoring your Productivity Momentum
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={loading || pdfExporting}
                        className="btn-secondary inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                        <FileDown size={16} className="shrink-0" />
                        {pdfExporting ? "Generating…" : "Export PDF"}
                    </button>
                    <button type="button" onClick={() => onTabChange("analytics")} className="btn-primary text-[11px] font-black uppercase tracking-widest">
                        Detailed Report
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Zap size={24} />} label="Focus Score" value={`${metrics.score}%`} trend={metrics.score > 70 ? "OPTIMAL" : "NEEDS FOCUS"} color="primary" />
                <StatCard icon={<Clock size={24} />} label="Total Focus" value={formatTime(metrics.totalTime)} trend={`${formatTime(metrics.productiveTime)} prod.`} color="secondary" />
                <StatCard icon={<Target size={24} />} label="Streak" value={`${metrics.streak} Days`} trend="RESISTANCE" color="success" />
                <StatCard icon={<Activity size={24} />} label="Peak Period" value={metrics.peakHour ? `${metrics.peakHour % 12 || 12} ${metrics.peakHour >= 12 ? 'PM' : 'AM'}` : "..."} trend="IDEAL ZONE" color="warning" />
            </div>

            <div className="glass-card overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between border-b-ui bg-foreground/[0.03] px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary"><TrendingUp size={24} /></div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Daily Activity Hub</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-10 p-8 lg:grid-cols-12">
                    <div className="min-w-0 space-y-6 lg:col-span-7">
                        <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> Usage Breakdown</h3>
                        <div className="space-y-4">
                            <ActivityRow label="Deep Work" time={metrics.productiveTime} color="success" total={metrics.totalTime} />
                            <ActivityRow label="Distraction" time={metrics.unproductiveTime} color="danger" total={metrics.totalTime} />
                            <ActivityRow label="Neutral" time={metrics.neutralTime} color="muted" total={metrics.totalTime} />
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-col items-center justify-center rounded-[40px] border-2 border-ui bg-foreground/[0.04] p-6 lg:col-span-5">
                        <div className="relative mb-4 h-40 min-h-40 w-full min-w-0">
                            {distribution.length > 0 ? (
                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                    minWidth={0}
                                    minHeight={160}
                                    debounce={50}
                                    initialDimension={{ width: 400, height: 160 }}
                                >
                                    <RePieChart>
                                        <Pie
                                            data={distribution}
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="var(--chart-pie-stroke)"
                                            strokeWidth={1}
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
                                            formatter={(v, name) => [typeof v === "number" ? `${Math.round(v)}s` : v, name]}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full rounded-full border-2 border-dashed border-ui-muted" />
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-black text-foreground">{metrics.score}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                    <div className="mb-6 flex items-center gap-3 border-b-ui pb-4">
                        <div className="rounded-xl bg-green-500/10 p-2 text-green-500">
                            <Zap size={18} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90">Top Productive</h3>
                    </div>
                    <div className="space-y-4">
                        {topDomains.filter((d) => d.category === "productive" && domainMatches(d)).slice(0, 5).length === 0 ? (
                            <p className="py-6 text-center text-xs text-muted">
                                {activitySearchQuery.trim() ? "No productive sites match your search." : "No productive sites yet."}
                            </p>
                        ) : null}
                        {topDomains.filter((d) => d.category === "productive" && domainMatches(d)).slice(0, 5).map((domain) => (
                            <div
                                key={domain._id}
                                className="flex items-center justify-between rounded-2xl border-2 border-transparent p-3 transition-colors hover:border-ui hover:bg-foreground/[0.04]"
                            >
                                <div className="flex items-center gap-4">
                                    <Image
                                        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(faviconHostFromTrackingId(domain._id))}&sz=64`}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-lg"
                                        alt=""
                                        unoptimized
                                    />
                                    <span className="text-sm font-bold text-foreground/80">{domain._id}</span>
                                </div>
                                <span className="font-mono text-sm font-black text-green-500">{formatTime(domain.totalTime)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card p-8">
                    <div className="mb-6 flex items-center gap-3 border-b-ui pb-4">
                        <div className="rounded-xl bg-red-500/10 p-2 text-red-500">
                            <MousePointer2 size={18} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground/90">Top Distractions</h3>
                    </div>
                    <div className="space-y-4">
                        {topDomains.filter((d) => d.category === "unproductive" && domainMatches(d)).slice(0, 5).length === 0 ? (
                            <p className="py-6 text-center text-xs text-muted">
                                {activitySearchQuery.trim() ? "No distracting sites match your search." : "No distracting sites yet."}
                            </p>
                        ) : null}
                        {topDomains.filter((d) => d.category === "unproductive" && domainMatches(d)).slice(0, 5).map((domain) => (
                            <div
                                key={domain._id}
                                className="flex items-center justify-between rounded-2xl border-2 border-transparent p-3 transition-colors hover:border-ui hover:bg-foreground/[0.04]"
                            >
                                <div className="flex items-center gap-4">
                                    <Image
                                        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(faviconHostFromTrackingId(domain._id))}&sz=64`}
                                        width={32}
                                        height={32}
                                        className="w-8 h-8 rounded-lg"
                                        alt=""
                                        unoptimized
                                    />
                                    <span className="text-sm font-bold text-foreground/80">{domain._id}</span>
                                </div>
                                <span className="font-mono text-sm font-black text-red-500">{formatTime(domain.totalTime)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <section className="space-y-6 mb-20">
                <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] flex items-center gap-3"><TrendingUp size={16} /> Activity History</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {topDomains.filter(domainMatches).length === 0 && activitySearchQuery.trim() ? (
                        <div className="col-span-full py-8 text-center text-sm text-muted">No sites match your search.</div>
                    ) : null}
                    {topDomains.filter(domainMatches).slice(0, 5).map((domain) => (
                        <div
                            key={domain._id}
                            className="glass-card group p-5 transition-all hover:bg-foreground/[0.06]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <Image
                                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(faviconHostFromTrackingId(domain._id))}&sz=64`}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded"
                                alt=""
                                unoptimized
                            />
                                <h4 className="text-xs font-black truncate text-foreground/90">{domain._id}</h4>
                            </div>
                            <span className="text-sm font-black font-mono text-primary">{formatTime(domain.totalTime)}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function StatCard({ icon, label, value, trend, color }) {
    const colors = {
        primary: "text-primary bg-primary/10",
        secondary: "text-secondary bg-secondary/10",
        success: "text-success bg-success/10",
        warning: "text-warning bg-warning/10"
    };
    return (
        <div className="glass-card group relative p-7 transition-all hover:scale-105">
            <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ui ${colors[color]}`}
            >
                {icon}
            </div>
            <div className="text-muted text-[10px] font-black uppercase tracking-widest">{label}</div>
            <div className="mt-1 text-3xl font-black text-foreground">{value}</div>
            <div className="mt-2 text-[9px] font-black text-muted/60 uppercase tracking-widest flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${colors[color].split(' ')[1]}`} /> {trend}
            </div>
        </div>
    );
}

function ActivityRow({ label, time, color, total }) {
    const formatTime = (seconds) => {
        if (!seconds || seconds <= 0) return "0s";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        let res = "";
        if (h > 0) res += `${h}h `;
        if (m > 0) res += `${m}m `;
        res += `${s}s`;
        return res;
    };
    const colors = {
        success: "bg-success",
        danger: "bg-danger",
        muted: "bg-muted",
        primary: "bg-primary"
    };
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${colors[color]}`} />
                <span className="text-xs font-bold text-muted">{label}</span>
            </div>
            <span className="font-mono text-sm font-black text-foreground">{formatTime(time)}</span>
        </div>
    );
}
