"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import {
    LayoutDashboard,
    BarChart3,
    Target,
    ShieldAlert,
    Lightbulb,
    Timer,
    Settings,
    LogOut,
    Sun,
    Moon,
    Chrome,
    User as UserIcon,
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
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { activeTab, setActiveTab } = useDashboard();
    const { theme, toggleTheme } = useTheme();

    if (!user) return null;

    return (
        <aside className="w-64 h-screen border-r border-foreground/10 bg-background flex flex-col p-6 sticky top-0">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                    <Chrome className="text-background" size={18} />
                </div>
                <span className="text-xl font-bold gradient-text tracking-tighter">ProdLytics</span>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                            activeTab === item.id
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                        )}
                    >
                        <item.icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === item.id && "text-primary")} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="pt-6 border-t border-foreground/5 space-y-2">
                <button
                    onClick={() => setActiveTab("setup")}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                        activeTab === "setup"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted hover:text-foreground hover:bg-foreground/5"
                    )}
                >
                    <ExternalLink size={20} className={cn("transition-transform group-hover:scale-110", activeTab === "setup" && "text-primary")} />
                    <span className="font-medium">Extension Setup</span>
                </button>
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 px-4 py-3 w-full text-muted hover:text-foreground transition-all"
                >
                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
            </div>
        </aside>
    );
}
