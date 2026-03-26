"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import {
    LayoutDashboard,
    BarChart3,
    Target,
    ShieldAlert,
    Lightbulb,
    Timer,
    Sun,
    Moon,
    Chrome,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/Providers";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", id: "overview" },
    { icon: BarChart3, label: "Analytics", id: "analytics" },
    { icon: Target, label: "Goals", id: "goals" },
    { icon: ShieldAlert, label: "Focus Mode", id: "focus" },
    { icon: Timer, label: "Timer", id: "timer" },
    { icon: Lightbulb, label: "AI Insights", id: "insights" },
];

export default function Sidebar() {
    const { user } = useAuth();
    const { activeTab, setActiveTab } = useDashboard();
    const { theme, toggleTheme } = useTheme();

    if (!user) return null;

    return (
        <aside className="sticky top-0 flex h-screen w-64 flex-col border-r-ui bg-background p-6">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                    <Chrome className="text-white" size={18} />
                </div>
                <span className="text-xl font-bold gradient-text tracking-tighter">ProdLytics</span>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "sidebar-nav-btn group border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                            activeTab === item.id &&
                                "border-primary/35 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/[0.14]"
                        )}
                    >
                        <item.icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === item.id && "text-primary")} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="space-y-2 border-t-ui-muted pt-6">
                <button
                    type="button"
                    onClick={() => setActiveTab("setup")}
                    className={cn(
                        "sidebar-nav-btn group border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                        activeTab === "setup" &&
                            "border-primary/35 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/[0.14]"
                    )}
                >
                    <ExternalLink size={20} className={cn("transition-transform group-hover:scale-110", activeTab === "setup" && "text-primary")} />
                    <span className="font-medium">Extension Setup</span>
                </button>
                <button type="button" onClick={toggleTheme} className="theme-toggle-btn">
                    {theme === "dark" ? <Sun size={20} className="shrink-0 text-primary" /> : <Moon size={20} className="shrink-0 text-primary" />}
                    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
            </div>
        </aside>
    );
}
