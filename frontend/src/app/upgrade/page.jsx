"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Sparkles, Crown, ArrowLeft } from "lucide-react";

function safeInternalPath(raw, fallback = "/") {
    if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return fallback;
}

export default function UpgradePage() {
    const { user, loading, applySessionToken } = useAuth();
    const router = useRouter();
    const params = useSearchParams();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [message, setMessage] = useState("");
    const confirmStarted = useRef(false);

    const sessionId = useMemo(() => params.get("session_id") || "", [params]);
    const successParam = useMemo(() => params.get("success") === "1", [params]);
    const nextPath = useMemo(() => safeInternalPath(params.get("next"), "/"), [params]);

    const isPro = Boolean(user && (user.subscription === "pro" || user.isPremium));

    useEffect(() => {
        if (loading || !user) return;
        if (String(user.role || "user") === "admin" && !successParam) {
            router.replace("/admin");
        }
    }, [user, loading, router, successParam]);

    useEffect(() => {
        if (loading || !user || !isPro) return;
        router.replace(nextPath || "/");
    }, [loading, user, isPro, router, nextPath]);

    useEffect(() => {
        if (!successParam || !sessionId || confirmStarted.current) return;
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        confirmStarted.current = true;

        (async () => {
            try {
                const res = await fetch("/api/billing/confirm-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setMessage(data?.error || "Could not verify payment. Contact support if you were charged.");
                    confirmStarted.current = false;
                    return;
                }
                if (data.subscription === "pro" || data.ok === true) {
                    await applySessionToken(token);
                    setMessage("Welcome to Premium. Redirecting…");
                    router.replace(nextPath || "/");
                    return;
                }
                setMessage("Payment is still processing. Refresh in a moment or check your email.");
            } catch {
                confirmStarted.current = false;
                setMessage("Could not verify payment. If you were charged, use Settings -> Subscription.");
            }
        })();
    }, [successParam, sessionId, applySessionToken, router, nextPath]);

    async function startCheckout() {
        if (!user) {
            window.location.href = `/auth/login?callbackUrl=${encodeURIComponent(`/upgrade?next=${encodeURIComponent(nextPath)}`)}`;
            return;
        }
        if (user?.isAnonymous) {
            window.location.href = "/";
            return;
        }
        if (isPro) {
            router.replace(nextPath || "/");
            return;
        }

        setCheckoutLoading(true);
        setMessage("");
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch("/api/billing/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ nextPath }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to start checkout.");
            window.location.href = data.url;
        } catch (error) {
            setMessage(error.message || "Checkout failed.");
            setCheckoutLoading(false);
        }
    }

    if (loading || !user) {
        return (
            <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 text-center text-sm text-muted">
                Loading...
            </div>
        );
    }

    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background px-4 py-10 sm:px-6 sm:py-14">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -right-32 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-[90px]" />
                <div className="absolute -bottom-24 -left-32 h-72 w-72 rounded-full bg-secondary/20 blur-[90px]" />
            </div>

            <div className="relative mx-auto w-full max-w-[560px]">
                <Link
                    href={nextPath || "/"}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:text-primary"
                >
                    <ArrowLeft size={14} aria-hidden />
                    Back
                </Link>

                <div className="glass-card mt-6 rounded-[30px] border-2 border-ui p-8 text-center shadow-lg shadow-black/25 sm:p-10">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/35 bg-amber-400/10">
                        <Crown className="text-amber-300" size={30} aria-hidden />
                    </div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        <Sparkles size={12} aria-hidden />
                        Premium
                    </p>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                        Upgrade to ProdLytics Premium
                    </h1>
                    <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-muted">
                        Unlock Predictive Analytics, Weekly Reports, Goal-Based Insights, and advanced AI productivity guidance.
                    </p>
                    <p className="mt-4 text-lg font-black text-foreground">INR 199 / month</p>

                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={startCheckout}
                            disabled={checkoutLoading || successParam}
                            className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-95 disabled:opacity-60 sm:w-auto"
                        >
                            {checkoutLoading || successParam ? "Please wait..." : "Buy Premium"}
                        </button>
                        <Link
                            href={nextPath || "/"}
                            className="w-full rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-foreground/90 hover:bg-foreground/5 sm:w-auto"
                        >
                            Not now
                        </Link>
                    </div>
                    {message ? <p className="mt-4 text-sm font-medium text-primary">{message}</p> : null}
                </div>
            </div>
        </div>
    );
}
