"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { matchesActivitySearch } from "@/lib/activitySearch";
import { goalsService } from "@/services/goals.service";
import {
    ShieldAlert,
    Lock,
    EyeOff,
    Globe,
    Plus,
    X,
    Trash2,
    Cpu,
    Zap,
    Activity,
    BrainCircuit,
    ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { requestExtensionSync } from "@/lib/extensionSync";
import { normalizeWebsiteHost } from "@/lib/normalizeWebsiteHost";

export default function FocusView() {
    const { user, updatePreference } = useAuth();
    const { activitySearchQuery } = useDashboard();
    const [domains, setDomains] = useState([]);
    const [newDomain, setNewDomain] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            synchronizeDomains();
        }
    }, [user]);

    async function synchronizeDomains() {
        setLoading(true);
        try {
            const data = await goalsService.getBlocklist();
            setDomains(data);
        } catch (err) {
            console.error("Error fetching blocklist:", err);
        } finally {
            setLoading(false);
        }
    }

    const dispatchExtensionSync = () => {
        requestExtensionSync();
    };

    const addDomain = async () => {
        const normalized = normalizeWebsiteHost(newDomain);
        if (!normalized) return;
        const already = domains.some((s) => normalizeWebsiteHost(s.website) === normalized);
        if (already) return;
        try {
            const res = await goalsService.addToBlocklist(normalized);
            setDomains([...domains.filter((s) => normalizeWebsiteHost(s.website) !== normalized), res]);
            setNewDomain("");
            dispatchExtensionSync();
        } catch (err) {
            console.error("Error adding site to blocklist:", err);
        }
    };

    const removeDomain = async (id) => {
        try {
            await goalsService.removeFromBlocklist(id);
            setDomains(domains.filter(s => s._id !== id));
            dispatchExtensionSync();
        } catch (err) {
            console.error("Error removing site from blocklist:", err);
        }
    };

    if (!user) return null;

    const visibleBlocklist = domains.filter((d) => matchesActivitySearch(activitySearchQuery, d.website));

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-16 relative pb-20">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center shadow-lg shadow-secondary/10 border border-secondary/20">
                            <ShieldAlert className="text-secondary" size={32} />
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-foreground via-foreground to-foreground/45 bg-clip-text text-transparent">
                            Focus Mode
                        </h1>
                    </div>
                </div>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative">
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7 space-y-8">
                    <div className="glass-card p-10 space-y-10 border-2 border-ui shadow-2xl">
                        <div className="flex items-center justify-between border-b-ui pb-6">
                            <h2 className="text-xs font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3">
                                <Lock size={16} /> Neural Blocklist
                            </h2>
                            <span className="rounded-full border-2 border-ui bg-foreground/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
                                {activitySearchQuery.trim()
                                    ? `${visibleBlocklist.length} shown · ${domains.length} total`
                                    : `${domains.length} Active Rules`}
                            </span>
                        </div>

                        <div className="relative group">
                            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-all duration-500" size={20} />
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                                placeholder="Domain or full URL (any site, e.g. reddit.com)"
                                className="w-full rounded-2xl border-2 border-ui bg-foreground/[0.03] py-6 pl-14 pr-16 text-base font-medium text-foreground placeholder:text-muted/50 transition-all focus:border-primary/50 focus:bg-foreground/[0.06] focus:outline-none"
                            />
                            <button type="button" onClick={addDomain} className="btn-icon-primary absolute right-4 top-1/2 -translate-y-1/2">
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                            {loading ? (
                                <div className="py-20 text-center">Identifying Targets...</div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {domains.length === 0 ? (
                                        <div className="py-20 text-center opacity-30 italic">No restrictions active.</div>
                                    ) : visibleBlocklist.length === 0 ? (
                                        <div className="py-16 text-center text-sm text-muted">
                                            No blocklist sites match your search.
                                        </div>
                                    ) : (
                                        visibleBlocklist.map((domain) => (
                                            <motion.div key={domain._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group flex items-center justify-between rounded-3xl border-2 border-ui bg-foreground/[0.02] p-6 transition-all duration-500 hover:border-primary/40 hover:bg-foreground/[0.05]">
                                                <div className="flex items-center gap-5 flex-wrap">
                                                    <Image src={`https://www.google.com/s2/favicons?domain=${domain.website}&sz=64`} alt="" width={24} height={24} className="w-6 h-6 rounded-md" unoptimized />
                                                    <span className="block text-lg font-black text-foreground/90">{domain.website}</span>
                                                    {domain.source === "smart_daily_cap" && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                                                            Smart cap
                                                        </span>
                                                    )}
                                                </div>
                                                <button onClick={() => removeDomain(domain._id)} className="p-3 text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={20} />
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5 space-y-10">
                    <div className="glass-card p-10 space-y-10 border-2 border-ui shadow-2xl">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-primary/10 rounded-2xl"><Activity className="text-primary" size={24} /></div>
                            <h3 className="text-2xl font-black tracking-tight">Advanced Guard</h3>
                        </div>
                        <div className="space-y-8">
                            <ToggleSetting
                                icon={<Lock className="text-secondary" size={18} />}
                                label="Strict Lock"
                                description="Force activation across all synced devices"
                                checked={user.preferences?.strictMode}
                                onChange={async (val) => {
                                    await updatePreference('strictMode', val);
                                    dispatchExtensionSync();
                                }}
                                sliderVariant="secondary"
                            />
                            <ToggleSetting
                                icon={<BrainCircuit className="text-primary" size={18} />}
                                label="AI Smart Block"
                                description="After 3 hours unproductive time today, the site is blocked and added to your Neural Blocklist (until you remove it)"
                                checked={user.preferences?.smartBlock}
                                onChange={async (val) => {
                                    await updatePreference('smartBlock', val);
                                    dispatchExtensionSync();
                                }}
                                sliderVariant="primary"
                            />
                            <ToggleSetting
                                icon={<Zap className="text-yellow-400" size={18} />}
                                label="Flow Reminders"
                                description="Browser notification on a fixed rhythm when you're active (Chrome idle = active)"
                                checked={user.preferences?.breakReminders}
                                onChange={async (val) => {
                                    await updatePreference('breakReminders', val);
                                    dispatchExtensionSync();
                                }}
                                sliderVariant="warning"
                            />
                            {user.preferences?.breakReminders && (
                                <div className="ml-2 space-y-4 border-l-ui py-2 pl-6">
                                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold">
                                        Extension shows a break reminder every &quot;focus stretch&quot; while the system sees you as active.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-muted tracking-wider">Focus stretch (min)</label>
                                            <input
                                                type="number"
                                                min={5}
                                                max={180}
                                                className="mt-1.5 w-full rounded-xl border-2 border-ui bg-foreground/[0.04] px-4 py-2.5 text-sm font-medium text-foreground"
                                                defaultValue={user.preferences?.focusSessionMinutes ?? 25}
                                                key={`focus-${user.preferences?.focusSessionMinutes}`}
                                                onBlur={async (e) => {
                                                    const v = Math.min(180, Math.max(5, parseInt(e.target.value, 10) || 25));
                                                    e.target.value = String(v);
                                                    await updatePreference("focusSessionMinutes", v);
                                                    dispatchExtensionSync();
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-muted tracking-wider">Break goal (min)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={60}
                                                className="mt-1.5 w-full rounded-xl border-2 border-ui bg-foreground/[0.04] px-4 py-2.5 text-sm font-medium text-foreground"
                                                defaultValue={user.preferences?.breakSessionMinutes ?? 5}
                                                key={`break-${user.preferences?.breakSessionMinutes}`}
                                                onBlur={async (e) => {
                                                    const v = Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 5));
                                                    e.target.value = String(v);
                                                    await updatePreference("breakSessionMinutes", v);
                                                    dispatchExtensionSync();
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}

function ToggleSetting({ icon, label, description, checked, onChange, sliderVariant = "primary" }) {
    const sliderClass =
        sliderVariant === "secondary"
            ? "slider slider-secondary"
            : sliderVariant === "warning"
              ? "slider slider-warning"
              : "slider slider-primary";

    return (
        <div className="group/toggle flex items-center justify-between rounded-2xl border-2 border-ui bg-foreground/[0.02] p-5 transition-colors hover:border-ui-strong hover:bg-foreground/[0.04]">
            <div className="flex min-w-0 flex-1 items-center gap-5 pr-4">
                <div className="shrink-0 rounded-xl border-2 border-ui bg-foreground/5 p-3">{icon}</div>
                <div className="min-w-0">
                    <p className="text-base font-black text-foreground/90">{label}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted opacity-80">{description}</p>
                </div>
            </div>
            <label className="switch">
                <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
                <span className={sliderClass} />
            </label>
        </div>
    );
}
