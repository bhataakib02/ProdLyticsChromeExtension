"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { trackingService } from "@/services/tracking.service";
import {
    BrainCircuit,
    Sparkles,
    Activity,
    Zap,
    TrendingUp,
    Clock
} from "lucide-react";
import { motion } from "framer-motion";
import BurnoutRiskChart from "@/components/D3Charts";

export default function InsightsView() {
    const { user } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [cognitiveMetrics, setCognitiveMetrics] = useState([]);
    const [insightsData, setInsightsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            synchronizeInsights();
        }
    }, [user]);

    async function synchronizeInsights() {
        setLoading(true);
        try {
            const [summaryData, cognitiveResponse] = await Promise.all([
                trackingService.getSummary(),
                trackingService.getCognitiveLoad()
            ]);
            setMetrics(summaryData);
            setCognitiveMetrics(cognitiveResponse?.history || []);
            setInsightsData(cognitiveResponse?.metrics || null);
        } catch (err) { console.error("error fetching insights:", err); }
        finally { setLoading(false); }
    }

    if (!user) return null;

    const latestLoad = cognitiveMetrics.length > 0 ? cognitiveMetrics[cognitiveMetrics.length - 1].loadScore : 0;

    // Dynamic Recommendations
    const getRecommendations = () => {
        const recs = [];
        if (latestLoad > 7) recs.push({ title: "Cognitive Overload", desc: "Your neural load is peaking. We recommend a 15-minute screen break.", icon: <Zap className="text-red-400" />, type: "warning" });
        if (metrics?.score > 80) recs.push({ title: "Flow State Detected", desc: "You've been in a deep work zone. Keep it up to hit your daily goal.", icon: <Sparkles className="text-primary" />, type: "success" });
        if (metrics?.productiveTime < metrics?.unproductiveTime) recs.push({ title: "Distraction Alert", desc: "Busy work is outpacing deep work. Try a 25-min Pomodoro session.", icon: <Activity className="text-orange-400" />, type: "info" });
        recs.push({ title: "Peak Window", desc: "Your optimal neural flow typically occurs between 10 AM and 1 PM.", icon: <Clock className="text-secondary" />, type: "neutral" });
        return recs;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            {/* AI Coach Header */}
            <header className="relative p-12 rounded-[50px] overflow-hidden border border-white/10 glass-card">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full -mr-40 -mt-40" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 text-primary font-black text-xs uppercase tracking-[0.4em] mb-6">
                            <Sparkles size={16} /> PRODLYTICS AI NEURAL ENGINE
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.9] text-white mb-6">
                            Optimal Focus is yours today, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{user?.name.split(' ')[0]}</span>.
                        </h1>
                        <p className="text-xl text-muted font-medium leading-relaxed">
                            Based on your browsing patterns, you've achieved a <span className="text-white font-bold">{metrics?.score || 0}% focus efficiency</span>.
                            Your cognitive load is currently <span className="text-secondary font-bold">{latestLoad > 7 ? 'High' : latestLoad > 4 ? 'Moderate' : 'Optimal'}</span>.
                        </p>
                    </div>
                    <div className="flex-shrink-0 relative group">
                        <div className="absolute inset-0 bg-primary/40 blur-3xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-700" />
                        <div className="w-48 h-48 rounded-full border-[10px] border-white/5 flex flex-col items-center justify-center relative bg-black/40 backdrop-blur-3xl">
                            <span className="text-5xl font-black tracking-tighter">{metrics?.score || 0}%</span>
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest mt-1">Efficiency</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Recommendations & Deep Work Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-10">
                    <section>
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                            <TrendingUp size={16} /> Neural Flow Recommendations
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {getRecommendations().map((rec, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={i}
                                    className="p-8 pb-10 rounded-[40px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                        {rec.icon}
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                                        {rec.icon}
                                    </div>
                                    <h4 className="text-lg font-black mb-3">{rec.title}</h4>
                                    <p className="text-sm text-muted leading-relaxed font-medium">{rec.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    <section className="glass-card p-10 border border-white/5">
                        <h3 className="text-xl font-black flex items-center gap-3 mb-10 text-white/90">
                            <Activity className="text-secondary" /> Cognitive Load Over Time
                        </h3>
                        <div className="h-[350px] w-full flex items-center justify-center">
                            {loading ? (
                                <div className="text-muted/40 animate-pulse font-black uppercase tracking-widest text-xs">Simulating Neural Flow...</div>
                            ) : (
                                <BurnoutRiskChart data={cognitiveMetrics} />
                            )}
                        </div>
                    </section>
                </div>

                <aside className="space-y-10">
                    <div className="glass-card p-10 border border-white/5 bg-gradient-to-b from-primary/5 to-transparent">
                        <h3 className="text-xs font-black text-muted uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
                            <BrainCircuit size={16} /> Neural Metrics
                        </h3>
                        <div className="space-y-8">
                            <MetricRow label="Neural Intensity" value={insightsData?.intensity + "%" || "0%"} sub="Engagement level" color="primary" fill={insightsData?.intensity + "%"} />
                            <MetricRow label="Task Resilience" value={insightsData?.resilience + "%" || "0%"} sub="Sustained focus" color="success" fill={insightsData?.resilience + "%"} />
                            <MetricRow label="Cognitive Drag" value={insightsData?.drag + "%" || "0%"} sub="Context switching" color="danger" fill={insightsData?.drag + "%"} />
                            <MetricRow label="Deep Work Ratio" value={insightsData?.deepWorkHours + "h" || "0h"} sub="Total efficiency" color="secondary" fill={insightsData?.ratio + "%"} />
                        </div>
                    </div>

                    <div className="p-8 rounded-[40px] bg-secondary/10 border border-secondary/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-3xl -z-10" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-secondary mb-4 tracking-[0.3em]">AI Milestone</h4>
                        <p className="text-lg font-black text-white/90 leading-tight">You are in the top 5% of productive users this week. Stay elite.</p>
                        <div className="mt-6 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '95%' }} className="h-full bg-secondary" />
                        </div>
                    </div>
                </aside>
            </div>

            <style jsx global>{`
                .glass-card { background: rgba(15, 15, 23, 0.4); backdrop-filter: blur(40px); border-radius: 50px; border: 1px solid rgba(255, 255, 255, 0.05); }
            `}</style>
        </div>
    );
}

function MetricRow({ label, value, sub, color, fill }) {
    const colors = { primary: "bg-primary", success: "bg-success", danger: "bg-danger", secondary: "bg-secondary" };
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">{label}</div>
                    <div className="text-lg font-black text-white/90">{value}</div>
                </div>
                <div className="text-[10px] font-bold text-muted/60">{sub}</div>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: fill }} className={`h-full ${colors[color]}`} />
            </div>
        </div>
    );
}
