"use client";

import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { usePathname, useRouter } from "next/navigation";
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
    ExternalLink,
    Sparkles,
    Shield,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/Providers";
import { PremiumBadge } from "@/components/premium/PremiumUpsellDialog";

const menuItems = [
    { icon: LayoutDashboard, label: "Overview", id: "overview" },
    { icon: BarChart3, label: "Analytics", id: "analytics" },
    { icon: Target, label: "Goals", id: "goals" },
    { icon: ShieldAlert, label: "Focus Mode", id: "focus" },
    { icon: Timer, label: "Timer", id: "timer" },
];

export default function Sidebar() {
    const { user } = useAuth();
    const { activeTab, setActiveTab } = useDashboard();
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname() || "";
    const router = useRouter();
    const onAiCoachRoute = pathname.startsWith("/insights/ai-coach");
    const insightsNavActive = activeTab === "insights" && !onAiCoachRoute;

    if (!user) return null;

    return (
        <aside className="sticky top-0 hidden h-screen min-h-0 w-16 shrink-0 flex-col overflow-hidden border-r-ui bg-background p-3 md:flex md:w-64 md:p-6">
            <div className="mb-6 flex shrink-0 items-center gap-3 md:mb-10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/30 ring-1 ring-white/20">
                    <Chrome className="text-white" size={20} />
                </div>
                <div className="hidden flex-col md:flex">
                    <span className="text-xl font-black tracking-tighter text-foreground leading-tight">ProdLytics</span>

                </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5 [scrollbar-width:thin]">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        aria-label={item.label}
                        onClick={() => {
                            router.push("/");
                            setActiveTab(item.id);
                        }}
                        className={cn(
                            "sidebar-nav-btn group border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                            activeTab === item.id &&
                                "border-primary/35 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/[0.14]"
                        )}
                    >
                        <item.icon size={20} className={cn("transition-transform group-hover:scale-110", activeTab === item.id && "text-primary")} />
                        <span className="hidden font-medium md:inline">{item.label}</span>
                    </button>
                ))}

                <div className="pt-4">
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.28em] text-muted/90">AI Insights</p>
                    <div className="space-y-1.5">
                        <button
                            type="button"
                            title="Insights"
                            aria-label="Insights"
                            onClick={() => {
                                router.push("/");
                                setActiveTab("insights");
                            }}
                            className={cn(
                                "sidebar-nav-btn group w-full border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                                insightsNavActive &&
                                    "border-primary/35 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/[0.14]"
                            )}
                        >
                            <Lightbulb
                                size={20}
                                className={cn(
                                    "transition-transform group-hover:scale-110",
                                    insightsNavActive && "text-primary"
                                )}
                            />
                            <span className="hidden font-medium md:inline">Insights</span>
                        </button>
                        <button
                            type="button"
                            title="AI Coach (Premium)"
                            aria-label="AI Coach (Premium)"
                            onClick={() => router.push("/insights/ai-coach")}
                            className={cn(
                                "sidebar-nav-btn group w-full border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                                onAiCoachRoute &&
                                    "border-primary/35 bg-primary/10 text-primary hover:border-primary/40 hover:bg-primary/[0.14]"
                            )}
                        >
                            <Sparkles
                                size={20}
                                className={cn("transition-transform group-hover:scale-110", onAiCoachRoute && "text-primary")}
                            />
                            <span className="hidden min-w-0 flex-1 text-left font-medium md:inline">AI Coach</span>
                            {user.subscription !== "pro" && !user.isPremium ? (
                                <PremiumBadge className="hidden md:inline-flex" />
                            ) : null}
                        </button>
                    </div>
                </div>

                {user.role === "admin" ? (
                    <div className="pt-6">
                        <p className="mb-2.5 hidden px-1 text-[10px] font-black uppercase tracking-[0.3em] text-muted/70 md:block">System Root</p>
                        <button
                            type="button"
                            title="Admin Dashboard"
                            aria-label="Admin Dashboard"
                            onClick={() => router.push("/admin")}
                            className={cn(
                                "sidebar-nav-btn group w-full border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                                pathname === "/admin" &&
                                    "border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/5 hover:border-primary/50"
                            )}
                        >
                            <Shield size={20} className={cn("transition-transform group-hover:rotate-12 group-hover:scale-110", pathname === "/admin" && "text-primary")} />
                            <span className="hidden font-bold md:inline">Admin Panel</span>
                        </button>
                    </div>
                ) : null}
            </nav>

            <div className="shrink-0 space-y-2 border-t-ui-muted pt-4 md:pt-6">
                <button
                    type="button"
                    title="Settings"
                    aria-label="Settings"
                    onClick={() => router.push("/settings")}
                    className={cn(
                        "sidebar-nav-btn group border-ui-muted bg-foreground/[0.02] text-muted hover:border-ui hover:bg-foreground/5 hover:text-foreground",
                        pathname === "/settings" &&
                            "border-primary/40 bg-primary/10 text-primary shadow-lg shadow-primary/5 hover:border-primary/50"
                    )}
                >
                    <Settings size={20} className={cn("transition-transform group-hover:scale-110", pathname === "/settings" && "text-primary")} />
                    <span className="hidden font-medium md:inline">Settings</span>
                </button>
                <button
                    type="button"
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    onClick={toggleTheme}
                    className="theme-toggle-btn"
                >
                    {theme === "dark" ? <Sun size={20} className="shrink-0 text-primary" /> : <Moon size={20} className="shrink-0 text-primary" />}
                    <span className="hidden md:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </button>
            </div>
        </aside>
    );
}
