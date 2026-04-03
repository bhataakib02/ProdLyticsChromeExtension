"use client";

import Link from "next/link";
import { Sparkles, Crown, LayoutDashboard } from "lucide-react";
import { canAccessAiCoachClient } from "@/lib/premiumAccess";

const SUPPORT_EMAIL =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPPORT_EMAIL)?.trim() || "support@prodlytics.app";

/**
 * Wraps AI Coach content. Free users see an upgrade prompt; children are not mounted.
 * Access: `subscription === "pro"` or `isPremium`. Optional `NEXT_PUBLIC_AI_COACH_PREMIUM_BYPASS=true` for QA only.
 */
export function AiCoachPremiumGate({ user, children }) {
    if (canAccessAiCoachClient(user)) {
        return children;
    }

    return (
        <div className="relative flex min-h-[min(70vh,640px)] items-center justify-center px-4 py-12 md:py-16">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.18),transparent),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(251,191,36,0.12),transparent)]"
            />
            <div className="relative w-full max-w-xl rounded-[28px] border-ui-muted bg-foreground/[0.045] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-10">
                <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border px-2 py-2 shadow-[0_12px_40px_rgba(251,191,36,0.15)]"
                     style={{ backgroundColor: 'var(--premium-bg)', borderColor: 'var(--premium-border)' }}>
                    <Crown style={{ color: 'var(--premium-icon)' }} size={36} aria-hidden strokeWidth={1.35} />
                </div>
                <div className="mb-3 flex justify-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/12 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                        <Sparkles size={12} aria-hidden />
                        Premium
                    </span>
                </div>
                <h1 className="text-center text-2xl font-black tracking-tight text-foreground md:text-[1.75rem] md:leading-snug">
                    AI Coach is a Premium feature
                </h1>
                <p className="mt-4 text-center text-sm font-medium leading-relaxed text-muted">
                    Smart productivity score, behavioral patterns, distraction insights, coaching suggestions, weekly reports,
                    forecasts, and goal-aware guidance are included with ProdLytics Premium.
                </p>
                <div className="mt-9 grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-ui-muted bg-transparent px-5 py-3.5 text-sm font-bold text-foreground/90 transition hover:bg-foreground/5 sm:col-span-2"
                    >
                        <LayoutDashboard size={18} aria-hidden />
                        Back to dashboard
                    </Link>
                    {user?.isAnonymous ? (
                        <>
                            <Link
                                href={`/auth/register?callbackUrl=${encodeURIComponent("/insights/ai-coach")}`}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95"
                            >
                                Create account
                            </Link>
                            <Link
                                href={`/auth/login?register=1&callbackUrl=${encodeURIComponent("/insights/ai-coach")}`}
                                className="inline-flex items-center justify-center rounded-xl border border-primary/45 bg-primary/[0.12] px-5 py-3.5 text-sm font-bold text-primary transition hover:bg-primary/[0.18]"
                            >
                                Log in
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={`/upgrade?next=${encodeURIComponent("/insights/ai-coach")}`}
                            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95 sm:col-span-2"
                        >
                            Buy Premium — ₹199/mo
                        </Link>
                    )}
                </div>
                <p className="mt-6 text-center text-xs text-muted">
                    Need help?{" "}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-primary underline-offset-4 hover:underline">
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    );
}
