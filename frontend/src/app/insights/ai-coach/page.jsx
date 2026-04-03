"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, ChevronLeft } from "lucide-react";
import { AiCoachPremiumGate } from "@/components/premium/AiCoachPremiumGate";
import { AiCoachCategoryNav } from "@/components/insights/aiCoach/AiCoachCategoryNav";
import { AiCoachFeaturePanels } from "@/components/insights/aiCoach/AiCoachFeaturePanels";
import { AiCoachProSuite } from "@/components/insights/aiCoach/AiCoachProSuite";
import { useAiCoachInsightsData } from "@/hooks/useAiCoachInsightsData";
import { AI_COACH_FEATURES, AI_COACH_SLUGS } from "@/lib/aiCoachRoutes";

function AiCoachHubBody() {
    const searchParams = useSearchParams();
    const data = useAiCoachInsightsData();
    const featureFromQuery = searchParams.get("feature");
    const defaultFeature = AI_COACH_FEATURES[0]?.slug;
    const activeFeature = featureFromQuery && AI_COACH_SLUGS.has(featureFromQuery) ? featureFromQuery : defaultFeature;

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
            <Link
                href="/"
                className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
            >
                <ChevronLeft size={14} aria-hidden />
                Back to dashboard
            </Link>

            <div className="mb-5">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
                        <Sparkles className="text-primary" size={26} aria-hidden />
                        AI Coach
                    </h1>
                    <span className="rounded-md border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-200/95">
                        Premium
                    </span>
                </div>
            </div>

            <div className="mb-6 rounded-2xl border border-white/10 bg-foreground/[0.02] p-2">
                <AiCoachCategoryNav
                    className="border-0"
                    activeSlug={activeFeature}
                    getHref={(slug) => `/insights/ai-coach?feature=${slug}`}
                />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 md:p-6">
                <AiCoachProSuite data={data} />
                <AiCoachFeaturePanels feature={activeFeature} data={data} />
                <p className="mt-4 text-center text-[10px] font-medium leading-relaxed text-muted/80 px-2">
                    Pro coaching layers your live extension data (score, hourly splits, goals, week-over-week trends) into
                    actionable steps—sync often for the freshest read.
                </p>
            </div>
        </div>
    );
}

export default function AiCoachHubPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted">
                <p className="text-foreground">Sign in to use AI Coach.</p>
            </div>
        );
    }

    return (
        <AiCoachPremiumGate user={user}>
            <AiCoachHubBody />
        </AiCoachPremiumGate>
    );
}
