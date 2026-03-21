"use client";

import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/context/AuthContext";
import axios from "axios";
import {
    BarChart3,
    PieChart,
    Calendar,
    Download,
    Filter,
    Clock,
    TrendingUp,
    ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";
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

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [range, setRange] = useState("week");
    const [sites, setSites] = useState([]);
    const [distribution, setDistribution] = useState([]);
    const [hourly, setHourly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, range]);

    async function fetchData() {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const headers = { Authorization: `Bearer ${token}` };

            const [sitesRes, distRes, hourlyRes] = await Promise.all([
                axios.get(`${API_URL}/tracking?range=${range}`, { headers }),
                axios.get(`${API_URL}/tracking/score?range=${range}`, { headers }),
                axios.get(`${API_URL}/tracking/hourly?range=${range}`, { headers })
            ]);

            setSites(sitesRes.data);

            // Format distribution for Pie Chart
            const distData = [
                { name: "Productive", value: distRes.data.productive, color: "#22c55e" },
                { name: "Neutral", value: distRes.data.neutral, color: "#94a3b8" },
                { name: "Unproductive", value: distRes.data.unproductive, color: "#ef4444" }
            ].filter(d => d.value > 0);
            setDistribution(distData);

            // Format hourly for Bar Chart (already transformed by backend into { hour, productive, ... })
            const hourlyChartData = hourlyRes.data.map(h => ({
                hour: h.hour,
                display: `${h.hour}:00`,
                minutes: Math.round((h.productive + h.unproductive + h.neutral) / 60)
            }));
            setHourly(hourlyChartData);

        } catch (err) {
            console.error("Error fetching analytics data:", err);
        } finally {
            setLoading(false);
        }
    }

    if (!user) return null;

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold font-outfit tracking-tight">Analytics</h1>
                    <p className="text-muted mt-2 font-inter text-sm">Deep dive into your productivity trends and platform usage.</p>
                </div>
                <div className="flex items-center gap-3 bg-foreground/5 p-1.5 rounded-2xl border border-foreground/10">
                    {["today", "week", "month"].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${range === r ? "bg-primary text-background shadow-lg" : "text-muted hover:text-foreground"}`}
                        >
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Activity Bar Chart */}
                <div className="lg:col-span-2 glass-card p-8">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Clock className="text-primary" size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Time Distribution</h2>
                        </div>
                    </div>
                    <div className="h-80 w-full relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted italic">Loading charts...</div>
                        ) : hourly.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-muted italic text-sm">No activity data yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="display" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "12px" }}
                                        itemStyle={{ color: "#fff" }}
                                        formatter={(value) => [`${value} mins`, "Focus Time"]}
                                    />
                                    <Bar dataKey="minutes" fill="var(--color-primary)" radius={[4, 4, 0, 0]} minPointSize={2}>
                                        {hourly.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.minutes > 30 ? "#6366f1" : "rgba(99, 102, 241, 0.2)"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Categorization Pie Chart */}
                <div className="glass-card p-8 flex flex-col items-center">
                    <div className="flex items-center gap-4 mb-10 w-full">
                        <div className="p-3 bg-accent/10 rounded-xl">
                            <PieChart className="text-accent" size={24} />
                        </div>
                        <h2 className="text-xl font-bold">Category Split</h2>
                    </div>
                    <div className="h-64 w-full relative flex items-center justify-center mb-10">
                        {distribution.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={distribution}
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "12px" }}
                                            formatter={(value) => [`${Math.round(value / 60)} mins`, "Total"]}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                                    <span className="text-4xl font-black text-primary drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                                        {distribution.length > 0 ? Math.round((distribution[0].value / distribution.reduce((a, b) => a + b.value, 0)) * 100) : 0}%
                                    </span>
                                    <span className="text-[10px] text-muted uppercase tracking-[0.2em] font-black">Efficiency</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-muted italic text-sm">Waiting for categorization...</div>
                        )}
                    </div>
                    <div className="space-y-4 flex-1">
                        {distribution.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm font-medium text-muted">{item.name}</span>
                                </div>
                                <span className="text-sm font-bold">{Math.round(item.value / 60)}m</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Sites Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-8 border-b border-foreground/5 flex justify-between items-center bg-foreground/[0.01]">
                    <h2 className="text-xl font-bold font-outfit flex items-center gap-3 uppercase tracking-wider text-sm">
                        <TrendingUp size={24} className="text-primary" />
                        Most Visited Platforms
                    </h2>
                </div>
                {loading ? (
                    <div className="p-20 text-center text-muted italic font-inter">Loading your activity...</div>
                ) : sites.length === 0 ? (
                    <div className="p-20 text-center text-muted italic font-inter">No activity tracked for this range yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-foreground/[0.03] text-muted text-[10px] font-black uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5">Website</th>
                                    <th className="px-8 py-5">Category</th>
                                    <th className="px-8 py-5">Time Spent</th>
                                    <th className="px-8 py-5">Frequency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-inter">
                                {sites.slice(0, 10).map((site) => (
                                    <tr key={site._id} className="hover:bg-foreground/[0.02] transition-all group">
                                        <td className="px-8 py-5">
                                            <a
                                                href={`https://${site._id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 w-fit group"
                                            >
                                                <span className="font-bold group-hover:text-primary transition-colors">{site._id}</span>
                                                <ExternalLink size={14} className="text-muted/0 group-hover:text-muted/50 transition-all" />
                                            </a>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${site.category === 'productive' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : site.category === 'unproductive' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                                                {site.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 font-mono text-sm">
                                            {Math.floor(site.totalTime / 3600)}h {Math.floor((site.totalTime % 3600) / 60)}m
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 bg-foreground/10 rounded-full flex-1 max-w-[80px] overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary"
                                                        style={{ width: `${Math.min(100, (site.totalTime / sites[0].totalTime) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted font-bold">{site.sessions} <span className="text-[8px] opacity-50">SESSIONS</span></span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
