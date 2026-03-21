"use client";

import { useState, useEffect } from "react";
import { User, Save, Loader2, Target, Mail } from "lucide-react";
import { useAuth, API_URL } from "@/context/AuthContext";
import axios from "axios";

export default function ProfilePage() {
    const { user, checkUser } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [weeklyGoalHours, setWeeklyGoalHours] = useState(40);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setWeeklyGoalHours(user.preferences?.weeklyGoalHours || 40);
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("accessToken");
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Update Profile (Name/Email)
            await axios.put(`${API_URL}/auth/profile`, { name, email }, { headers });

            // 2. Update Preferences (Weekly Goal)
            await axios.put(`${API_URL}/auth/preferences`, {
                weeklyGoalHours
            }, { headers });

            await checkUser();
            alert("Profile updated successfully!");
        } catch (err) {
            console.error("Error saving profile:", err);
            alert(err.response?.data?.error || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header className="space-y-2">
                <h1 className="text-4xl font-bold font-outfit">My Profile</h1>
                <p className="text-muted font-inter">Manage your personal information and productivity goals.</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
                {/* Profile Card */}
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-foreground/5 flex items-center gap-3 bg-foreground/[0.02]">
                        <User className="text-primary" size={20} />
                        <h2 className="font-bold font-outfit uppercase tracking-wider text-sm">Personal Information</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                                    <input
                                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                                    <input
                                        className="w-full bg-foreground/5 border border-foreground/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email address"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Productivity Goals */}
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-foreground/5 flex items-center gap-3 bg-foreground/[0.02]">
                        <Target className="text-accent" size={20} />
                        <h2 className="font-bold font-outfit uppercase tracking-wider text-sm">Productivity Goals</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="max-w-xs space-y-2">
                            <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Weekly Target (Hours)</label>
                            <input
                                type="number"
                                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-foreground/[0.08] transition-all font-inter text-sm"
                                value={weeklyGoalHours}
                                onChange={(e) => setWeeklyGoalHours(parseInt(e.target.value) || 0)}
                            />
                            <p className="text-[11px] text-muted">Set a target for how many hours you want to be productive each week.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 py-4 rounded-2xl font-bold bg-primary text-background flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all font-outfit text-sm disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
