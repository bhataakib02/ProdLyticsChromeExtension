"use client";

import { useAuth } from "@/context/AuthContext";
import { DashboardProvider } from "@/context/DashboardContext";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import DeepWorkTimerStrip from "@/components/layout/DeepWorkTimerStrip";
import { LayoutDashboard, BarChart3, Target, Lightbulb, Settings } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AppFrame({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        return <div className="min-h-screen bg-background">{children}</div>;
    }

    return (
        <DashboardProvider>
            <div className="flex min-h-screen bg-background text-foreground transition-colors duration-500">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <Navbar />
                    <DeepWorkTimerStrip />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto pb-20 bg-foreground/[0.02] md:pb-0">{children}</main>
                    <MobileNav />
                </div>
            </div>
        </DashboardProvider>
    );
}

function MobileNav() {
    const { activeTab, setActiveTab } = useDashboard();
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const tabs = [
        { id: "overview", icon: LayoutDashboard, label: "Home" },
        { id: "analytics", icon: BarChart3, label: "Stats" },
        { id: "goals", icon: Target, label: "Goals" },
        { id: "insights", icon: Lightbulb, label: "Insights" },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] flex h-16 items-center justify-around border-t-ui bg-background/80 px-2 pb-safe backdrop-blur-xl md:hidden">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => {
                        router.push("/");
                        setActiveTab(tab.id);
                    }}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all",
                        activeTab === tab.id ? "text-primary" : "text-muted"
                    )}
                >
                    <div className={cn(
                        "flex h-8 w-12 items-center justify-center rounded-xl transition-all",
                        activeTab === tab.id && "bg-primary/10 shadow-sm shadow-primary/5"
                    )}>
                        <tab.icon size={20} weight={activeTab === tab.id ? "fill" : "regular"} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tight">{tab.label}</span>
                </button>
            ))}
            
            <button
                onClick={() => router.push("/settings")}
                className={cn(
                    "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all",
                    pathname === "/settings" ? "text-primary" : "text-muted"
                )}
            >
                <div className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-xl transition-all",
                    pathname === "/settings" && "bg-primary/10 shadow-sm shadow-primary/5"
                )}>
                    <Settings size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">Setup</span>
            </button>
        </nav>
    );
}
