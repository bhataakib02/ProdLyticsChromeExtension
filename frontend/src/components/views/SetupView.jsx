"use client";

import { useState } from "react";
import { Chrome, Download, RefreshCw, CheckCircle2, Zap, Laptop, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function SetupView() {
    const { user } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);

    const synchronizeExtension = () => {
        setSyncing(true);
        setTimeout(() => { setSyncing(false); setSyncStatus("success"); }, 1200);
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-16 relative">
            <header className="text-center space-y-6">
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] border-2 border-ui bg-gradient-to-br from-primary/20 to-secondary/20 shadow-2xl">
                    <Chrome className="text-primary" size={40} />
                </div>
                <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/45 bg-clip-text text-transparent">ProdLytics Extension</h1>
                <p className="text-muted text-lg max-w-2xl mx-auto font-medium">The bridge between your focused work and advanced deep-learning analytics.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StepCard index={1} title="Download" desc="Install the lightweight monitoring extension." icon={Download} color="primary" />
                <StepCard index={2} title="Quick Pin" desc="Pin ProdLytics to your toolbar for status visibility." icon={Laptop} color="warning" />
                <StepCard index={3} title="Active Sync" desc="Securely link your dashboard account." icon={RefreshCw} color="secondary" />
            </div>

            <div className="glass-card flex flex-col items-center space-y-10 bg-foreground/[0.02] p-16 text-center">
                <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto"><ShieldCheck size={32} className="text-primary" /></div>
                    <h2 className="text-3xl font-black tracking-tighter">Initialize Secure Sync</h2>
                </div>
                <button type="button" onClick={synchronizeExtension} disabled={syncing} className="btn-primary-lg max-w-sm uppercase tracking-widest">
                    {syncing ? <RefreshCw className="animate-spin" size={20} /> : "Authorize Sync"}
                </button>
                {syncStatus === 'success' && <div className="text-green-500 font-black uppercase text-xs tracking-widest flex items-center gap-2"><CheckCircle2 size={18} /> Synced!</div>}
            </div>
        </div>
    );
}

function StepCard({ index, title, desc, icon: Icon, color }) {
    const colors = { primary: 'text-primary bg-primary/10', warning: 'text-warning bg-warning/10', secondary: 'text-secondary bg-secondary/10' };
    return (
        <div className="glass-card p-10 flex flex-col items-center text-center space-y-6 hover:border-primary/40 transition-all">
            <div className={`flex h-16 w-16 items-center justify-center rounded-3xl border-2 border-ui ${colors[color]}`}>
                <Icon size={28} />
            </div>
            <div>
                <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Phase 0{index}</div>
                <h3 className="text-2xl font-black tracking-tight text-foreground">{title}</h3>
                <p className="text-sm text-muted mt-2">{desc}</p>
            </div>
        </div>
    );
}
