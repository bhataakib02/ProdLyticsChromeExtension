"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Sparkles,
    Activity,
    Zap,
    Lightbulb,
    Calendar,
    TrendingUp,
    Target,
    LayoutGrid,
} from "lucide-react";
import { AI_COACH_FEATURES } from "@/lib/aiCoachRoutes";
import { cn } from "@/lib/utils";

const ICON_BY_SLUG = {
    "smart-productivity-score": Sparkles,
    "behavioral-patterns": Activity,
    "distraction-alerts": Zap,
    "personalized-suggestions": Lightbulb,
    "weekly-report": Calendar,
    "predictive-analytics": TrendingUp,
    "goal-insights": Target,
};

/**
 * Single row: all 7/8 categories visible. Icon above label; active state uses underline bar.
 */
export function AiCoachCategoryNav({ className = "", activeSlug = null, getHref = null, showAllLink = false }) {
    const pathname = usePathname() || "";

    const allLink = { slug: "all", title: "Show All Insights", short: "All", icon: LayoutGrid };
    const items = showAllLink ? [allLink, ...AI_COACH_FEATURES] : AI_COACH_FEATURES;

    return (
        <nav className={cn("border-b border-white/10", className)} aria-label="AI Coach categories">
            <div className={cn(
                "grid w-full gap-1 py-1 sm:gap-2",
                items.length === 8 ? "grid-cols-8" : "grid-cols-7"
            )}>
                {items.map((f) => {
                    const href = f.slug === "all" 
                        ? (getHref ? getHref("all") : "/insights/ai-coach") 
                        : (getHref ? getHref(f.slug) : `/insights/ai-coach/${f.slug}`);
                    const isActive = activeSlug ? activeSlug === f.slug : pathname === href;
                    const Icon = f.icon || ICON_BY_SLUG[f.slug] || Sparkles;
                    return (
                        <Link
                            key={f.slug}
                            href={href}
                            title={f.title}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-0.5 py-2 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-1",
                                isActive
                                    ? "border-primary/45 bg-primary/12 shadow-[0_0_0_1px_rgba(99,102,241,0.12)]"
                                    : "border-white/10 bg-foreground/[0.02] hover:border-white/20 hover:bg-foreground/[0.04]"
                            )}
                        >
                            <span
                                className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-9 sm:w-9",
                                    isActive
                                        ? "border-primary/60 bg-primary/20 text-primary"
                                        : "border-white/12 bg-white/[0.03] text-foreground/85"
                                )}
                            >
                                <Icon className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" strokeWidth={2} aria-hidden />
                            </span>
                            <span
                                className={cn(
                                    "w-full px-0.5 text-[9px] font-semibold leading-tight sm:text-[10px]",
                                    isActive ? "text-foreground" : "text-foreground/80"
                                )}
                            >
                                {f.short}
                            </span>
                            <span
                                className={cn(
                                    "h-0.5 w-5 shrink-0 rounded-full sm:w-6",
                                    isActive ? "bg-primary" : "bg-transparent"
                                )}
                            />
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
