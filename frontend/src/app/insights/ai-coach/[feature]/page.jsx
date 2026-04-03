"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ChevronLeft } from "lucide-react";
import { AI_COACH_SLUGS, getAiCoachFeatureMeta } from "@/lib/aiCoachRoutes";
import { AiCoachPremiumGate } from "@/components/premium/AiCoachPremiumGate";
import { AiCoachCategoryNav } from "@/components/insights/aiCoach/AiCoachCategoryNav";
import { AiCoachFeaturePanels } from "@/components/insights/aiCoach/AiCoachFeaturePanels";
import { useAiCoachInsightsData } from "@/hooks/useAiCoachInsightsData";

function AiCoachFeatureBody({ slug }) {
    const data = useAiCoachInsightsData();
    const meta = getAiCoachFeatureMeta(slug);

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Link
                    href="/insights/ai-coach"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                    <ChevronLeft size={14} aria-hidden />
                    AI Coach home
                </Link>
                <span className="rounded-md border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-200/95">
                    Premium
                </span>
            </div>

            <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-white/10 bg-background/90 px-4 py-2 backdrop-blur-md md:mx-0 md:rounded-xl md:border md:px-3">
                <AiCoachCategoryNav className="border-0" />
            </div>

            <div className="mb-6">
                <h1 className="text-xl font-black tracking-tight text-foreground md:text-2xl">{meta?.title ?? "AI Coach"}</h1>
                <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">Live data from your extension</p>
            </div>

            <AiCoachFeaturePanels feature={slug} data={data} />
            <p className="mt-6 text-center text-[10px] font-medium leading-relaxed text-muted/80">
                Tips update from your latest sync—open the dashboard header sync if numbers look stale.
            </p>
        </div>
    );
}

export default function AiCoachFeaturePage() {
    const params = useParams();
    const slug = params?.feature;
    const { user, loading: authLoading } = useAuth();

    if (typeof slug !== "string" || !AI_COACH_SLUGS.has(slug)) {
        notFound();
    }

    if (authLoading) {
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
            <AiCoachFeatureBody slug={slug} />
        </AiCoachPremiumGate>
    );
}
