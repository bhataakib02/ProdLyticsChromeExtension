"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
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

export default function FocusView() {
    const { user, updatePreference } = useAuth();
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
        try {
            const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";
            if (typeof window !== "undefined" && window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage) {
                window.chrome.runtime.sendMessage(extensionId, { action: "syncAll" }, (response) => {
                    if (window.chrome.runtime.lastError) {
                        console.warn("❌ Could not sync blocklist:", window.chrome.runtime.lastError.message);
                    }
                });
            }
        } catch (error) {
            console.warn("Extension sync failed or skipped:", error);
        }
    };

    const addDomain = async () => {
        if (newDomain && !domains.find(s => s.website === newDomain)) {
            try {
                const res = await goalsService.addToBlocklist(newDomain);
                setDomains([...domains, res]);
                setNewDomain("");
                dispatchExtensionSync();
            } catch (err) {
                console.error("Error adding site to blocklist:", err);
            }
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
                        <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                            Focus Mode
                        </h1>
                    </div>
                </div>
            </motion.header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative">
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7 space-y-8">
                    <div className="glass-card p-10 space-y-10 border-white/5 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-6">
                            <h2 className="text-xs font-black uppercase text-primary tracking-[0.3em] flex items-center gap-3">
                                <Lock size={16} /> Neural Blocklist
                            </h2>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                {domains.length} Active Rules
                            </span>
                        </div>

                        <div className="relative group">
                            <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-all duration-500" size={20} />
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                                placeholder="Add domain (e.g. reddit.com)..."
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl py-6 pl-14 pr-16 focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all text-base font-medium placeholder:text-muted/50"
                            />
                            <button onClick={addDomain} className="absolute right-4 top-1/2 -translate-y-1/2 bg-primary text-background p-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30">
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
                                    ) : (
                                        domains.map((domain) => (
                                            <motion.div key={domain._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between p-6 bg-white/[0.01] border border-white/5 rounded-3xl group hover:border-primary/40 hover:bg-white/[0.02] transition-all duration-500">
                                                <div className="flex items-center gap-5">
                                                    <img src={`https://www.google.com/s2/favicons?domain=${domain.website}&sz=64`} alt="" className="w-6 h-6 rounded-md" />
                                                    <span className="font-black text-white/90 block text-lg">{domain.website}</span>
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
                    <div className="glass-card p-10 space-y-10 border-white/5 shadow-2xl">
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
                                themeColor="secondary"
                            />
                            <ToggleSetting
                                icon={<BrainCircuit className="text-primary" size={18} />}
                                label="AI Smart Block"
                                description="Detect adaptive distraction patterns"
                                checked={user.preferences?.smartBlock}
                                onChange={async (val) => {
                                    await updatePreference('smartBlock', val);
                                    dispatchExtensionSync();
                                }}
                                themeColor="primary"
                            />
                            <ToggleSetting
                                icon={<Zap className="text-yellow-400" size={18} />}
                                label="Flow Reminders"
                                description="Neuro-optimized break intervals"
                                checked={user.preferences?.breakReminders}
                                onChange={async (val) => {
                                    await updatePreference('breakReminders', val);
                                    dispatchExtensionSync();
                                }}
                                themeColor="yellow"
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            <style jsx global>{`
                .glass-card { background: rgba(255, 255, 255, 0.015); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 48px; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                 .switch { position: relative; display: inline-block; width: 54px; height: 28px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.05); transition: .4s; border: 1px solid rgba(255,255,255,0.1); border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: #6366f1; }
                input:checked + .slider.secondary { background-color: #ec4899; }
                input:checked + .slider.yellow { background-color: #f59e0b; }
                input:checked + .slider:before { transform: translateX(24px); }
            `}</style>
        </div>
    );
}

function ToggleSetting({ icon, label, description, checked, onChange, themeColor }) {
    return (
        <div className="flex items-center justify-between group/toggle p-4 rounded-3xl hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">{icon}</div>
                <div>
                    <p className="text-base font-black text-white/90">{label}</p>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold opacity-60">{description}</p>
                </div>
            </div>
            <label className="switch">
                <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
                <span className={`slider round ${themeColor}`}></span>
            </label>
        </div>
    );
}
