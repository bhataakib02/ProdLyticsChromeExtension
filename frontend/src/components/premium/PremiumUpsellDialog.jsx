"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Sparkles, X } from "lucide-react";

const SUPPORT_EMAIL =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPPORT_EMAIL)?.trim() || "support@prodlytics.app";

/**
 * Modal prompting upgrade. `open` controlled by parent.
 */
export function PremiumUpsellDialog({
    open,
    onOpenChange,
    title = "Premium feature",
    description = "Upgrade to ProdLytics Premium to unlock this.",
    user,
}) {
    const pathname = usePathname() || "/";
    const upgradeHref = `/upgrade?next=${encodeURIComponent(pathname)}`;
    const close = useCallback(() => onOpenChange(false), [onOpenChange]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, close]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const anon = Boolean(user?.isAnonymous);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
            <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                onClick={close}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="premium-upsell-title"
                className="relative z-[1] w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#1a1d26] to-[#12141a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-8"
            >
                <button
                    type="button"
                    onClick={close}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-foreground"
                    aria-label="Close dialog"
                >
                    <X size={18} />
                </button>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-[1.5px] border-amber-400/35 bg-gradient-to-br from-amber-400/20 to-primary/15 shadow-lg shadow-amber-500/10" style={{ borderColor: 'var(--premium-border)' }}>
                    <Crown size={28} aria-hidden style={{ color: 'var(--premium-icon)' }} />
                </div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    <Sparkles size={12} aria-hidden />
                    Premium
                </div>
                <h2 id="premium-upsell-title" className="pr-8 text-xl font-black tracking-tight text-foreground md:text-2xl">
                    {title}
                </h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-muted">{description}</p>
                <div className="mt-8 flex flex-col gap-3">
                    {anon ? (
                        <>
                            <Link
                                href={`/auth/register?callbackUrl=${encodeURIComponent(pathname)}`}
                                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-95"
                                onClick={close}
                            >
                                Create account
                            </Link>
                            <Link
                                href={`/auth/login?register=1&callbackUrl=${encodeURIComponent(pathname)}`}
                                className="inline-flex items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm font-bold text-primary hover:bg-primary/[0.15]"
                                onClick={close}
                            >
                                Log in
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={upgradeHref}
                            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-95"
                            onClick={close}
                        >
                            Buy Premium (₹199/mo)
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={close}
                        className="inline-flex items-center justify-center rounded-xl border border-white/14 px-5 py-3 text-sm font-bold text-foreground/90 hover:bg-white/[0.06]"
                    >
                        Not now
                    </button>
                </div>
                <p className="mt-4 text-center text-[11px] text-muted">
                    Need help?{" "}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-primary underline-offset-4 hover:underline">
                        Contact support
                    </a>
                </p>
            </div>
        </div>
    );
}

/** Small inline badge for buttons / cards */
export function PremiumBadge({ className = "" }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${className}`}
            style={{ 
                color: 'var(--premium-text)', 
                backgroundColor: 'var(--premium-bg)', 
                borderColor: 'var(--premium-border)' 
            }}
        >
            Premium
        </span>
    );
}
