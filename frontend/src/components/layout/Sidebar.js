"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Target, label: "Goals", href: "/goals" },
    { icon: ShieldAlert, label: "Focus Mode", href: "/focus" },
    { icon: Timer, label: "Deep Work", href: "/pomodoro" },
    { icon: Lightbulb, label: "AI Insights", href: "/insights" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    if (!user) return null;

    return (
        <aside className="w-64 h-screen border-r border-foreground/10 bg-background flex flex-col p-6 sticky top-0">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                    <Chrome className="text-background" size={18} />
                </div>
                <span className="text-xl font-bold gradient-text tracking-tighter">AERO</span>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                            pathname === item.href
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                        )}
                    >
                        <item.icon size={20} className={cn("transition-transform group-hover:scale-110", pathname === item.href && "text-primary")} />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="pt-6 border-t border-foreground/5 space-y-2">
                <Link
                    href="/profile"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                        pathname === "/profile"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted hover:text-foreground hover:bg-foreground/5"
                    )}
                >
                    <UserIcon size={20} className={cn("transition-transform group-hover:scale-110", pathname === "/profile" && "text-primary")} />
                    <span className="font-medium">My Profile</span>
                </Link>
                <Link
                    href="/extension"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                        pathname === "/extension"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted hover:text-foreground hover:bg-foreground/5"
                    )}
                >
                    <ExternalLink size={20} className={cn("transition-transform group-hover:scale-110", pathname === "/extension" && "text-primary")} />
                    <span className="font-medium">Extension Setup</span>
                </Link>
                <Link
                    href="/settings"
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                        pathname === "/settings"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted hover:text-foreground hover:bg-foreground/5"
                    )}
                >
                    <Settings size={20} className={cn("transition-transform group-hover:scale-110", pathname === "/settings" && "text-primary")} />
                    <span className="font-medium">Settings</span>
                </Link>
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 px-4 py-3 w-full text-muted hover:text-foreground transition-all"
                >
                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-muted hover:text-accent transition-all"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
