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

    useEffect(() => {
        if (user) {
            synchronizeInsights();
        }
    }, [user]);

    async function synchronizeInsights() {
        try {
            const [metricsData, cognitiveData] = await Promise.all([
                trackingService.getSummary(),
                trackingService.getCognitiveLoad()
            ]);
            setMetrics(metricsData);
            setCognitiveMetrics(Array.isArray(cognitiveData) ? cognitiveData : []);
        } catch (err) { console.error("error fetching insights:", err); }
    }

    if (!user) return null;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <header>
                <h1 className="text-4xl font-bold tracking-tight flex items-center gap-4">
                    <BrainCircuit className="text-primary" size={40} /> AI Neural Engine
                </h1>
                <p className="text-muted mt-2 text-sm">Personalized insights based on your raw browsing patterns.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent p-10 rounded-[40px] border border-white/10 relative overflow-hidden">
                    <div className="relative z-10 max-w-md">
                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-4"><Sparkles size={16} /> Peak Performance</div>
                        <h2 className="text-3xl font-extrabold mb-4 leading-tight">Your cognitive output is significantly higher in the morning.</h2>
                        <p className="text-white/70 leading-relaxed mb-8">Plan your deep work accordingly to maximize efficiency during your neural flow zone.</p>
                    </div>
                    <div className="absolute top-1/2 -right-10 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
                </div>
                <div className="glass-card p-8 flex flex-col justify-center items-center text-center">
                    <div className="text-[10px] text-muted uppercase tracking-widest font-black mb-4">Focus Score</div>
                    <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center text-3xl font-black">{metrics?.score || 0}%</div>
                    <p className="text-sm font-semibold mt-4">Current Efficiency</p>
                </div>
            </div>

            <div className="glass-card p-8 border border-white/5 mt-8">
                <h3 className="text-xl font-bold flex items-center gap-3 mb-8"><Activity className="text-accent" /> Cognitive Load Over Time</h3>
                <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-center min-h-[300px]">
                    <BurnoutRiskChart data={cognitiveMetrics} />
                </div>
            </div>
            <style jsx global>{`
                .glass-card { background: rgba(255, 255, 255, 0.015); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 48px; }
            `}</style>
        </div >
    );
}
