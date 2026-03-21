"use client";

import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/context/AuthContext";
import axios from "axios";
import {
    Lightbulb,
    BrainCircuit,
    Sparkles,
    TrendingUp,
    Search,
    Clock,
    Activity,
    Zap,
    ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import BurnoutRiskChart from "@/components/D3Charts";

export default function InsightsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [loadData, setLoadData] = useState([]);

    useEffect(() => {
        if (user) {
            fetchInsights();
            fetchCognitiveLoad();
        }
    }, [user]);

    async function fetchInsights() {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await axios.get(`${API_URL}/tracking/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (err) {
            console.error("Error fetching insights");
        } finally {
            setLoading(false);
        }
    }

    async function fetchCognitiveLoad() {
        try {
            const token = localStorage.getItem("accessToken");
            const res = await axios.get(`${API_URL}/tracking/cognitive-load`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoadData(res.data);
        } catch (err) {
            console.error("Error fetching cognitive load");
        }
    }

    const formatHourRange = (hour) => {
        if (hour === null || hour === undefined) return "Calculating...";
        const h = hour % 12 || 12;
        const ampm = hour >= 12 ? "PM" : "AM";
        const nextH = (hour + 1) % 12 || 12;
        const nextAmpm = (hour + 1) >= 12 ? "PM" : "AM";
        return `${h}:00 ${ampm} and ${nextH}:00 ${nextAmpm}`;
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold font-outfit tracking-tight flex items-center gap-4">
                        <BrainCircuit className="text-primary" size={40} />
                        AI Neural Engine
                    </h1>
                    <p className="text-muted mt-2 font-inter text-sm">Personalized insights based on your real browsing patterns.</p>
                </div>
                <div className="flex gap-2 bg-foreground/5 border border-foreground/10 p-1.5 rounded-2xl">
                    <span className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-primary text-background shadow-lg shadow-primary/20">Active Analysis</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Hero Insight Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent p-10 rounded-[40px] border border-foreground/10 relative overflow-hidden group">
                    <div className="relative z-10 max-w-md">
                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-4">
                            <Sparkles size={16} /> Peak Performance Detected
                        </div>
                        <h2 className="text-3xl font-extrabold mb-4 leading-tight">
                            {stats?.peakHour != null ? (
                                <>You are in the "Flow Zone" between {formatHourRange(stats?.peakHour)}.</>
                            ) : (
                                <>Analyzing your peak focus patterns...</>
                            )}
                        </h2>
                        <p className="text-foreground/80 leading-relaxed mb-8">
                            {stats?.peakHour != null ? (
                                <>Your cognitive output on coding task classification is significantly higher during this block. Plan your deep work accordingly.</>
                            ) : (
                                <>Keep using the extension to identify your most productive hours throughout the day.</>
                            )}
                        </p>
                        <Link href="/pomodoro" className="flex w-fit items-center gap-2 bg-foreground text-background px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl">
                            Start Deep Work Session <ChevronRight size={18} />
                        </Link>
                    </div>
                    <div className="absolute top-1/2 -right-10 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-all duration-1000" />
                </div>

                {/* Score Card */}
                <div className="glass-card p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-4">Current Efficiency</div>
                    <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center relative mb-6">
                        <motion.div
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="w-24 h-24 rounded-full border-[6px] border-primary border-t-transparent absolute"
                        />
                        <span className="text-3xl font-black">{stats?.score ? ((stats.score) / 10).toFixed(1) : "0.0"}</span>
                    </div>
                    <p className="text-sm font-semibold">{stats?.score > 70 ? "Exceeding Average" : "Learning Patterns"}</p>
                    <p className="text-[10px] text-muted">Focus intensity score based on latest sessions</p>
                </div>
            </div>

            {/* D3 Advanced Visualizations Panel */}
            <div className="glass-card p-8 border border-foreground/10 mt-8 mb-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-foreground/5">
                    <div>
                        <h3 className="text-xl font-bold font-outfit flex items-center gap-3">
                            <Activity className="text-secondary" /> Cognitive Load Over Time
                        </h3>
                        <p className="text-muted text-[10px] font-black uppercase tracking-widest mt-1">D3.js visualization of mental fatigue patterns</p>
                    </div>
                </div>
                <div className="bg-background rounded-2xl border border-foreground/10 p-4 flex items-center justify-center min-h-[300px]">
                    <BurnoutRiskChart data={loadData} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InsightCard
                    icon={<Zap className="text-yellow-400" />}
                    title="Productive Momentum"
                    desc={stats?.totalTime > 0 ? `You've clocked ${Math.floor(stats.totalTime / 3600)}h of focused work. Your streak is currently ${stats.streak || 0} days.` : "No productive momentum detected yet. Start a session to build your streak!"}
                />
                <InsightCard
                    icon={<TrendingUp className="text-green-400" />}
                    title="Time Breakdown"
                    desc={stats?.productiveTime > 0 ? `Your productive output represents ${Math.round((stats.productiveTime / (stats.totalTime || 1)) * 100)}% of your total logged activity.` : "Track your first sessions to see your time breakdown here."}
                />
                <InsightCard
                    icon={<Clock className="text-blue-400" />}
                    title="Neural Schedule"
                    desc={stats?.peakHour != null ? `Most of your high-yield work happens in the ${stats?.peakHour < 12 ? 'morning' : 'afternoon'}.` : "The neural engine is still learning your daily schedule."}
                />
            </div>
        </div>
    );
}

function InsightCard({ icon, title, desc }) {
    return (
        <div className="glass-card p-8 hover:border-primary/50 transition-all group">
            <div className="p-3 bg-foreground/5 w-fit rounded-xl mb-6 group-hover:scale-110 transition-all">
                {icon}
            </div>
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-muted leading-relaxed">{desc}</p>
        </div>
    );
}
