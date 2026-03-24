"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { trackingService } from "@/services/tracking.service";
import { goalsService } from "@/services/goals.service";
import {
    Activity,
    TrendingUp,
    Clock,
    Target,
    Zap,
    ArrowUpRight,
    Bell,
    Pencil,
    Trophy,
    PieChart,
    MousePointer2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PieChart as RePieChart,
    Pie,
    ResponsiveContainer,
    Cell
} from "recharts";

export default function OverviewView({ onTabChange }) {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState({ score: 0, totalTime: 0, productiveTime: 0, unproductiveTime: 0, neutralTime: 0, streak: 0, peakHour: null });
    const [objectives, setObjectives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topDomains, setTopDomains] = useState([]);

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
            if (objectivesData.status === "fulfilled" && Array.isArray(objectivesData.value)) {
                setObjectives(objectivesData.value);
            }
            if (domainsData.status === "fulfilled" && Array.isArray(domainsData.value)) {
                setTopDomains(domainsData.value.slice(0, 5));
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

    if (!user) return null;

    const distribution = [
        { name: "Productive", value: metrics.productiveTime || 0, color: "#22c55e" },
        { name: "Neutral", value: metrics.neutralTime || 0, color: "#94a3b8" },
        { name: "Unproductive", value: metrics.unproductiveTime || 0, color: "#ef4444" }
    ].filter(d => d.value > 0);

    return (
        <div className="p-8 space-y-10 max-w-7xl mx-auto">
            <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Welcome back, {user?.name.split(' ')[0]}
                    </h1>
                    <p className="text-muted mt-3 font-medium tracking-wide flex items-center gap-2">
                        <Activity size={14} className="text-primary" /> AERO AI is monitoring your Productivity Momentum
                    </p>
                </div>
                <button onClick={() => onTabChange('analytics')} className="bg-white text-black px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl">Detailed Report</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<Zap size={24} />} label="Focus Score" value={`${metrics.score}%`} trend={metrics.score > 70 ? "OPTIMAL" : "NEEDS FOCUS"} color="primary" />
                <StatCard icon={<Clock size={24} />} label="Total Focus" value={formatTime(metrics.totalTime)} trend={`${formatTime(metrics.productiveTime)} prod.`} color="accent" />
                <StatCard icon={<Target size={24} />} label="Streak" value={`${metrics.streak} Days`} trend="RESISTANCE" color="secondary" />
                <StatCard icon={<Activity size={24} />} label="Peak Period" value={metrics.peakHour ? `${metrics.peakHour % 12 || 12} ${metrics.peakHour >= 12 ? 'PM' : 'AM'}` : "..."} trend="IDEAL ZONE" color="blue" />
            </div>

            <div className="glass-card overflow-hidden border-white/5 shadow-2xl">
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary"><TrendingUp size={24} /></div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Daily Activity Hub</h2>
                    </div>
                </div>
                <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-6">
                        <h3 className="text-xs font-black text-muted uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> Usage Breakdown</h3>
                        <div className="space-y-4">
                            <ActivityRow label="Deep Work" time={metrics.productiveTime} color="green" total={metrics.totalTime} />
                            <ActivityRow label="Distraction" time={metrics.unproductiveTime} color="red" total={metrics.totalTime} />
                            <ActivityRow label="Neutral" time={metrics.neutralTime} color="slate" total={metrics.totalTime} />
                        </div>
                    </div>
                    <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-[40px]">
                        <div className="h-40 w-full relative mb-4">
                            {distribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie data={distribution} innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value" stroke="none">
                                            {distribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                    </RePieChart>
                                </ResponsiveContainer>
                            ) : <div className="w-full h-full border-2 border-dashed border-white/5 rounded-full" />}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-black text-white">{metrics.score}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section className="space-y-6 mb-20">
                <h3 className="text-xs font-black text-muted uppercase tracking-[0.3em] flex items-center gap-3"><MousePointer2 size={16} /> Top Activity</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {topDomains.map((domain, i) => (
                        <div key={domain._id} className="glass-card p-5 group hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <img src={`https://www.google.com/s2/favicons?domain=${domain._id}&sz=64`} className="w-6 h-6 rounded" alt="" />
                                <h4 className="text-xs font-black truncate text-white/90">{domain._id}</h4>
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
    const colors = { primary: "text-primary bg-primary/10", accent: "text-accent bg-accent/10", secondary: "text-green-500 bg-green-500/10", blue: "text-blue-400 bg-blue-500/10" };
    return (
        <div className="glass-card p-7 relative group border-white/5 transition-all hover:scale-105">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 mb-4 ${colors[color]}`}>{icon}</div>
            <div className="text-muted text-[10px] font-black uppercase tracking-widest">{label}</div>
            <div className="text-3xl font-black text-white/95 mt-1">{value}</div>
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
    const colors = { green: "bg-green-500", red: "bg-red-500", slate: "bg-slate-500", primary: "bg-primary" };
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${colors[color]}`} />
                <span className="text-xs font-bold text-muted">{label}</span>
            </div>
            <span className="font-mono text-sm font-black text-white">{formatTime(time)}</span>
        </div>
    );
}
