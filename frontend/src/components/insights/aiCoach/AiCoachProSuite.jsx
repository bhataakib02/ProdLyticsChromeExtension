"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Brain, Zap, Mail, Bell, Sparkles, Link2, Calendar, FileDown, TrendingUp, Flame, Clock } from "lucide-react";
import { useAuth, API_URL } from "@/context/AuthContext";
import { requestExtensionSync } from "@/lib/extensionSync";
import { estimateReclaimedMinutesWeekOverWeek } from "@/lib/reclaimedTime";
import { downloadFocusPlaybookPdf } from "@/lib/focusPlaybookPdf";
import { buildNextWeekFocusIcs } from "@/lib/buildTomorrowFocusIcs";
import { trackingService } from "@/services/tracking.service";
import { cn } from "@/lib/utils";
import { isProdlyticsPremiumUser } from "@/lib/premiumAccess";
import { PremiumUpsellDialog, PremiumBadge } from "@/components/premium/PremiumUpsellDialog";

function authHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const titleSerif = "font-[family-name:Georgia,ui-serif,serif]";

function ProToggle({ checked, onChange, variant }) {
    const on = variant === "amber";
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative h-8 w-[3.25rem] shrink-0 rounded-full border-2 transition-colors",
                checked
                    ? on
                        ? "border-amber-400/55 bg-amber-500/30"
                        : "border-violet-400/55 bg-violet-600/35"
                    : "border-white/15 bg-black/25"
            )}
        >
            <span
                className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform",
                    checked ? "left-[1.35rem]" : "left-1"
                )}
            />
        </button>
    );
}

function ProFeatureCard({
    icon,
    iconClass,
    title,
    description,
    checked,
    onChange,
    toggleVariant,
    showPremiumBadge,
    premiumLocked,
    onPremiumBlocked,
}) {
    return (
        <div className="relative flex items-center gap-4 overflow-hidden rounded-[22px] border border-white/14 bg-gradient-to-br from-[#252830] to-[#1b1e26] px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.42)]">
            {premiumLocked ? (
                <span className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-amber-400/12" />
            ) : null}
            <div
                className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-black/35 shadow-inner",
                    iconClass
                )}
            >
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <h3 className={cn(titleSerif, "text-[15px] font-semibold leading-snug tracking-tight text-white")}>
                        {title}
                    </h3>
                    {showPremiumBadge ? <PremiumBadge /> : null}
                </div>
                <p className="mt-2 text-[9px] font-bold uppercase leading-relaxed tracking-[0.11em] text-sky-100/50">
                    {description}
                </p>
            </div>
            <ProToggle
                checked={checked}
                onChange={(v) => {
                    if (premiumLocked && v) {
                        onPremiumBlocked?.();
                        return;
                    }
                    onChange(v);
                }}
                variant={toggleVariant}
            />
        </div>
    );
}

export function AiCoachProSuite({ data }) {
    const { user, updatePreference } = useAuth();
    const {
        metrics,
        weekComparison,
        aiReport,
        topDistractionRows,
        predictionSignal,
        focusSessionMinutes,
        peakMeta,
        loading,
    } = data;

    const [partnerShare, setPartnerShare] = useState({ enabled: false, token: null });
    const [weekdayInsight, setWeekdayInsight] = useState(null);
    const [pdfBusy, setPdfBusy] = useState(false);
    const [partnerBusy, setPartnerBusy] = useState(false);
    const [premiumOpen, setPremiumOpen] = useState(false);
    const [premiumMsg, setPremiumMsg] = useState({ title: "", description: "" });

    const prefs = user?.preferences || {};
    const premium = isProdlyticsPremiumUser(user);
    const blockPremium = (title, description) => {
        setPremiumMsg({ title, description });
        setPremiumOpen(true);
    };

    const loadPartnerShare = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/settings`, { headers: authHeaders() });
            const ps = res.data?.partnerShare;
            if (ps) setPartnerShare({ enabled: Boolean(ps.enabled), token: ps.token || null });
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        loadPartnerShare();
    }, [loadPartnerShare]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const w = await trackingService.getWeekdayInsights();
                if (!cancelled) setWeekdayInsight(w);
            } catch {
                if (!cancelled) setWeekdayInsight(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [loading, metrics?.score]);

    const reclaimed = useMemo(() => estimateReclaimedMinutesWeekOverWeek(weekComparison), [weekComparison]);

    const shareUrl = useMemo(() => {
        if (!partnerShare.token || typeof window === "undefined") return "";
        return `${window.location.origin}/share/focus/${partnerShare.token}`;
    }, [partnerShare.token]);

    const weekScoresForPdf = useMemo(() => {
        const prev = Number(weekComparison?.previous?.scoreSafe ?? weekComparison?.previous?.score);
        const cur = Number(weekComparison?.current?.scoreSafe ?? weekComparison?.current?.score);
        if (!Number.isFinite(prev) && !Number.isFinite(cur)) return null;
        return { previous: prev, current: cur };
    }, [weekComparison]);

    const threeRules = useMemo(() => {
        const top = topDistractionRows?.[0];
        const rules = [
            aiReport?.peakProdWindow
                ? `Block calendar time at ${aiReport.peakProdWindow} before low-value tabs arrive.`
                : null,
            top?.site
                ? `Treat ${top.site} as a budgeted break—not an always-on tab (${top.pretty || ""} today).`
                : null,
            predictionSignal?.type === "risk"
                ? `Front-load important work; the model flags a possible dip—change the environment early.`
                : `Book next week’s shield block while motivation is high.`,
        ].filter(Boolean);
        return rules.length >= 3 ? rules.slice(0, 3) : [...rules, "Sync the extension after deep work so coaching stays accurate."].slice(0, 3);
    }, [aiReport, topDistractionRows, predictionSignal]);

    const exportPdf = async () => {
        if (!premium) {
            blockPremium(
                "Export PDF is Premium",
                "Download your focus playbook PDF with peak windows, distraction insights, and three rules tailored to you."
            );
            return;
        }
        if (pdfBusy) return;
        setPdfBusy(true);
        try {
            const top = topDistractionRows?.[0];
            await downloadFocusPlaybookPdf({
                userName: user?.name,
                peakProdWindow: aiReport?.peakProdWindow,
                peakDistractionWindow: aiReport?.peakDistractionWindow,
                topDistractionSite: top?.site,
                topDistractionPretty: top?.pretty,
                weekScores: weekScoresForPdf,
                threeRules,
                streak: metrics?.streak,
            });
        } finally {
            setPdfBusy(false);
        }
    };

    const downloadNextWeekShield = () => {
        const d = peakMeta?.best?.date;
        if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
        const risk = predictionSignal?.type === "risk";
        const ics = buildNextWeekFocusIcs({
            title: risk
                ? `ProdLytics focus shield (before predicted dip, ${focusSessionMinutes}m)`
                : `ProdLytics focus shield next week (${focusSessionMinutes}m)`,
            peakDate: d,
            durationMinutes: focusSessionMinutes,
            uid: `prodlytics-shield-${Date.now()}@prodlytics.app`,
        });
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "prodlytics-focus-shield-next-week.ics";
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
    };

    const patchPartnerShare = async (enabled) => {
        setPartnerBusy(true);
        try {
            const res = await axios.patch(
                `${API_URL}/settings`,
                { partnerShare: { enabled } },
                { headers: authHeaders() }
            );
            const ps = res.data?.partnerShare;
            if (ps) setPartnerShare({ enabled: Boolean(ps.enabled), token: ps.token || null });
        } finally {
            setPartnerBusy(false);
        }
    };

    const copyShare = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch {
            /* ignore */
        }
    };

    const streak = Number(metrics?.streak) || 0;

    return (
        <section className="mb-8 space-y-5">
            <PremiumUpsellDialog
                open={premiumOpen}
                onOpenChange={setPremiumOpen}
                title={premiumMsg.title}
                description={premiumMsg.description}
                user={user}
            />
            <div>
                <h2 className={cn(titleSerif, "text-lg font-semibold text-white md:text-xl tracking-tight")}>
                    Pro automation &amp; delivery
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-100/45">
                    Premium tools from your screenshots — synced with Focus mode preferences
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <ProFeatureCard
                    icon={<Brain className="text-violet-300" size={22} strokeWidth={1.5} aria-hidden />}
                    iconClass="text-violet-300"
                    title="AI Smart Block"
                    description="After 3 hours unproductive time today, the site is blocked and added to your Neural Blocklist (until you remove it)"
                    checked={Boolean(prefs.smartBlock)}
                    onChange={async (v) => {
                        await updatePreference("smartBlock", v);
                        requestExtensionSync();
                    }}
                    toggleVariant="violet"
                    showPremiumBadge
                    premiumLocked={!premium}
                    onPremiumBlocked={() =>
                        blockPremium(
                            "AI Smart Block is Premium",
                            "Upgrade to auto-block heavy distraction patterns and sync with your Neural Blocklist."
                        )
                    }
                />
                <ProFeatureCard
                    icon={<Zap className="text-amber-300" size={22} strokeWidth={1.5} aria-hidden />}
                    iconClass="text-amber-300"
                    title="Flow Reminders"
                    description="Browser notification on a fixed rhythm when you're active (Chrome idle = active)"
                    checked={Boolean(prefs.breakReminders)}
                    onChange={async (v) => {
                        await updatePreference("breakReminders", v);
                        requestExtensionSync();
                    }}
                    toggleVariant="amber"
                    showPremiumBadge
                    premiumLocked={!premium}
                    onPremiumBlocked={() =>
                        blockPremium(
                            "Flow Reminders are Premium",
                            "Upgrade for rhythm-based browser nudges while you’re in flow."
                        )
                    }
                />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-foreground/[0.04] p-4">
                    <div className="flex items-center gap-2 text-white">
                        <Mail size={16} className="text-primary shrink-0" aria-hidden />
                        <span className={cn(titleSerif, "text-sm font-semibold")}>Weekly digest · email</span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-sky-100/50">
                        Same charts as your weekly report, delivered by email (pipeline hooks in when you enable SMTP).
                    </p>
                    <div className="mt-3 flex justify-end">
                        <ProToggle
                            checked={Boolean(prefs.weeklyDigestEmail)}
                            onChange={(v) => void updatePreference("weeklyDigestEmail", v)}
                            variant="violet"
                        />
                    </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-foreground/[0.04] p-4">
                    <div className="flex items-center gap-2 text-white">
                        <Bell size={16} className="text-secondary shrink-0" aria-hidden />
                        <span className={cn(titleSerif, "text-sm font-semibold")}>Weekly digest · push</span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-sky-100/50">
                        Web push when a new weekly rollup is ready — opt in here; we&apos;ll prompt for permission later.
                    </p>
                    <div className="mt-3 flex justify-end">
                        <ProToggle
                            checked={Boolean(prefs.weeklyDigestPush)}
                            onChange={(v) => void updatePreference("weeklyDigestPush", v)}
                            variant="amber"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-foreground/[0.04] p-4">
                <div className="flex items-center gap-2 text-white">
                    <Sparkles size={16} style={{ color: 'var(--premium-icon)' }} className="shrink-0" aria-hidden />
                    <span className={cn(titleSerif, "text-sm font-semibold")}>Softer phrasing (optional LLM)</span>
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-sky-100/50">
                    Off = structured coach only (privacy-first). On = room for friendlier wording using the same facts—no raw URLs sent to models when we wire it.
                </p>
                <div className="mt-3 flex justify-end">
                    <ProToggle
                        checked={Boolean(prefs.coachLlmPhrasing)}
                        onChange={(v) => void updatePreference("coachLlmPhrasing", v)}
                        variant="violet"
                    />
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-transparent p-4">
                    <div className="flex items-center gap-2" style={{ color: 'var(--premium-text)' }}>
                        <Flame size={18} className="shrink-0" aria-hidden />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-90">Streak</span>
                    </div>
                    <p className={cn(titleSerif, "mt-2 text-3xl font-bold text-white tabular-nums")}>{streak}</p>
                    <p className="mt-1 text-xs font-medium text-amber-100/70">productive days in a row</p>
                </div>
                <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent p-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Clock size={18} className="shrink-0" aria-hidden />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/90">Hours reclaimed (est.)</span>
                    </div>
                    <p className={cn(titleSerif, "mt-2 text-2xl font-bold text-white tabular-nums")}>
                        {reclaimed.minutes != null ? `${reclaimed.minutes} min` : "—"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted leading-relaxed">{reclaimed.label}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-foreground/[0.03] p-4">
                <div className="flex items-center gap-2 text-white">
                    <TrendingUp size={16} className="text-success shrink-0" aria-hidden />
                    <span className={cn(titleSerif, "text-sm font-semibold")}>Compare to your past self</span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground/85 leading-relaxed">
                    {weekdayInsight?.bestDayName ? (
                        <>
                            In the last 28 days, your strongest day for <strong className="text-foreground">productive</strong>{" "}
                            minutes was <strong className="text-primary">{weekdayInsight.bestDayName}</strong>
                            {weekdayInsight.bestProductiveMinutes ? (
                                <> (~{weekdayInsight.bestProductiveMinutes} min tracked).</>
                            ) : (
                                "."
                            )}{" "}
                            Stack important work there next week.
                        </>
                    ) : (
                        "Keep tracking—once we have enough weekday samples, we’ll call out your best day of the week."
                    )}
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                    type="button"
                    onClick={downloadNextWeekShield}
                    disabled={!peakMeta?.best}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-black/40 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Calendar size={16} strokeWidth={1.75} aria-hidden />
                    Add next week’s focus block
                </button>
                <button
                    type="button"
                    onClick={() => void exportPdf()}
                    disabled={pdfBusy}
                    className={cn(
                        titleSerif,
                        "inline-flex items-center justify-center gap-2 rounded-full border border-white/35 bg-transparent px-6 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition hover:border-white/55 disabled:opacity-50"
                    )}
                >
                    <span className="relative inline-flex h-5 w-5 items-center justify-center" aria-hidden>
                        <FileDown size={18} strokeWidth={1.5} className="opacity-90" />
                    </span>
                    {pdfBusy ? "…" : "Export PDF"}
                    <PremiumBadge />
                </button>
            </div>

            <div className="rounded-2xl border border-secondary/30 bg-foreground/[0.03] p-4">
                <div className="flex items-center gap-2 text-white">
                    <Link2 size={16} className="text-secondary shrink-0" aria-hidden />
                    <span className={cn(titleSerif, "text-sm font-semibold")}>Accountability partner link</span>
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-sky-100/50">
                    Read-only weekly focus trend — no sites, no history. Turn off anytime.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <ProToggle
                        checked={Boolean(partnerShare.enabled)}
                        onChange={(v) => void patchPartnerShare(v)}
                        variant="violet"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={!partnerShare.enabled || !shareUrl || partnerBusy}
                            onClick={() => void copyShare()}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground/90 hover:bg-white/10 disabled:opacity-40"
                        >
                            Copy link
                        </button>
                        <a
                            href={shareUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                !shareUrl || !partnerShare.enabled ? "pointer-events-none opacity-40" : "",
                                "rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                            )}
                        >
                            Open preview
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
