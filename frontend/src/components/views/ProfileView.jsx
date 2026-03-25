"use client";

import { useState, useEffect } from "react";
import { User, Save, Loader2, Target, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";

export default function ProfileView() {
    const { user, checkUser } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [weeklyGoalHours, setWeeklyGoalHours] = useState(40);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setWeeklyGoalHours(user.preferences?.weeklyGoalHours || 40);
        }
    }, [user]);

    const synchronizeProfile = async () => {
        setIsSaving(true);
        try {
            await authService.updateProfile({ name, email });
            await authService.updatePreferences({ weeklyGoalHours });
            await checkUser();
            alert("Profile synchronized successfully.");
        } catch (err) {
            console.error("error updating profile:", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header className="space-y-2">
                <h1 className="text-4xl font-bold ">My Profile</h1>
                <p className="text-muted ">Manage your personal information and productivity goals.</p>
            </header>

            <div className="grid grid-cols-1 gap-8">
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
                        <User className="text-primary" size={20} />
                        <h2 className="font-bold uppercase tracking-wider text-sm">Personal Information</h2>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
                        <input className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
                    </div>
                </div>

                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
                        <Target className="text-secondary" size={20} />
                        <h2 className="font-bold uppercase tracking-wider text-sm">Productivity Goals</h2>
                    </div>
                    <div className="p-8">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest block mb-2">Weekly Target (Hours)</label>
                        <input type="number" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none w-32" value={weeklyGoalHours} onChange={e => setWeeklyGoalHours(parseInt(e.target.value))} />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={synchronizeProfile} disabled={isSaving} className="bg-primary text-background px-10 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Profile
                    </button>
                </div>
            </div>
            <style jsx global>{`
                .glass-card { background: rgba(255, 255, 255, 0.015); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 48px; }
            `}</style>
        </div>
    );
}
