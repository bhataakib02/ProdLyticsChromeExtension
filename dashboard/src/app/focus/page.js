"use client";

import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/context/AuthContext";
import axios from "axios";
import {
    ShieldAlert,
    Lock,
    EyeOff,
    Globe,
    Plus,
    X,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FocusPage() {
    const { user, checkUser } = useAuth();
    const [sites, setSites] = useState([]);
    const [newSite, setNewSite] = useState("");
    const [loading, setLoading] = useState(true);

    const updatePreference = async (key, value) => {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.put(`${API_URL}/auth/preferences`, { [key]: value }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await checkUser(); // Refresh user data
            syncWithExtension();
        } catch (err) {
            console.error(`Error updating focus preference ${key}`);
        }
    };

    useEffect(() => {
        if (user) {
            fetchBlocklist();
        }
    }, [user]);

    async function fetchBlocklist() {
        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await axios.get(`${API_URL}/focus/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Keep full objects to have _id
            setSites(res.data);
        } catch (err) {
            console.error("Error fetching blocklist");
        } finally {
            setLoading(false);
        }
    }

    const addSite = async () => {
        if (newSite && !sites.find(s => s.website === newSite)) {
            try {
                const token = localStorage.getItem("accessToken");
                const res = await axios.post(`${API_URL}/focus/`, { site: newSite }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSites([...sites, res.data]);
                setNewSite("");
                syncWithExtension();
            } catch (err) {
                console.error("Error adding site to blocklist");
            }
        }
    };

    const removeSite = async (id) => {
        try {
            const token = localStorage.getItem("accessToken");
            await axios.delete(`${API_URL}/focus/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSites(sites.filter(s => s._id !== id));
            syncWithExtension();
        } catch (err) {
            console.error("Error removing site from blocklist");
        }
    };

    const syncWithExtension = () => {
        const extensionId = "dfbcfgkpgbfbdjabippomkelpkboffen";
        console.log(`📡 Syncing blocklist to extension: ${extensionId}`);
        if (typeof window !== "undefined" && window.chrome && window.chrome.runtime) {
            window.chrome.runtime.sendMessage(extensionId, { action: "syncAll" }, (response) => {
                if (window.chrome.runtime.lastError) {
                    console.warn("❌ Could not sync blocklist:", window.chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Blocklist synced successfully");
                }
            });
        }
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold font-outfit tracking-tight flex items-center gap-4">
                        <ShieldAlert className="text-accent" size={40} />
                        Focus Mode
                    </h1>
                    <p className="text-muted mt-2 font-inter text-sm">Manage your blocklist and eliminate distractions locales across synced browsers.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Blocklist Management */}
                <div className="glass-card p-8 space-y-8">
                    <h2 className="text-[10px] font-black uppercase text-muted tracking-[0.2em] flex items-center gap-3 border-b border-foreground/5 pb-4">
                        <Lock className="text-primary" size={16} />
                        Active Blocklist
                    </h2>

                    <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            value={newSite}
                            onChange={(e) => setNewSite(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSite()}
                            placeholder="Add website (e.g. reddit.com)..."
                            className="w-full bg-foreground/5 border border-foreground/10 rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all text-sm font-inter"
                        />
                        <button
                            onClick={addSite}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-background p-2.5 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-muted italic">Loading blocklist...</div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            <AnimatePresence>
                                {sites.length === 0 ? (
                                    <p className="text-center text-muted text-xs py-4 italic">No sites blocked yet.</p>
                                ) : (
                                    sites.map((site) => (
                                        <motion.div
                                            key={site._id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex items-center justify-between p-4 bg-foreground/[0.03] border border-foreground/5 rounded-xl group hover:border-primary/30 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
                                                    <img src={`https://www.google.com/s2/favicons?domain=${site.website}&sz=32`} alt="" className="w-4 h-4 opacity-70" />
                                                </div>
                                                <span className="font-medium text-sm">{site.website}</span>
                                            </div>
                                            <button
                                                onClick={() => removeSite(site._id)}
                                                className="text-muted hover:text-accent transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Focus Settings */}
                <div className="space-y-6">
                    <div className="glass-card p-8">
                        <h3 className="font-bold mb-6 flex items-center gap-3">
                            <EyeOff size={18} className="text-muted" /> Advanced Blocking
                        </h3>
                        <div className="space-y-6">
                            <ToggleSetting
                                label="Strict Mode"
                                description="Prevent extension from being disabled"
                                checked={user.preferences?.strictMode}
                                onChange={(val) => updatePreference('strictMode', val)}
                            />
                            <ToggleSetting
                                label="Smart Block"
                                description="Auto-detect distracting page patterns"
                                checked={user.preferences?.smartBlock}
                                onChange={(val) => updatePreference('smartBlock', val)}
                            />
                            <ToggleSetting
                                label="Break Reminders"
                                description="Force a break every 45 minutes"
                                checked={user.preferences?.breakReminders}
                                onChange={(val) => updatePreference('breakReminders', val)}
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-8 rounded-[32px] border border-foreground/10 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">Neural Scan</h3>
                            <p className="text-sm text-muted leading-relaxed">
                                AERO AI is monitoring your activity. Blocked sites will be restricted across all synced browsers.
                                <span className="text-primary cursor-pointer hover:underline block mt-2 font-bold">Learn how it works →</span>
                            </p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary blur-[80px] opacity-20 group-hover:opacity-40 transition-all duration-1000" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleSetting({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">{description}</p>
            </div>
            <label className="switch">
                <input
                    type="checkbox"
                    checked={!!checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="slider round"></span>
            </label>
        </div>
    );
}
