"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Download, X } from "lucide-react";

const DISMISS_KEY = "prodlytics-timer-alerts-onboarding-dismissed";

function isStandaloneDisplay() {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.navigator.standalone === true) return true;
    return false;
}

/**
 * One-time (dismissible) banner: browser notifications + optional PWA install.
 * Shown only when there is something actionable (permission prompt or install prompt).
 */
export function TimerAlertsOnboarding() {
    const [hydrated, setHydrated] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [notifyPermission, setNotifyPermission] = useState("default");

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            try {
                setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
            } catch {
                setDismissed(false);
            }
            if (typeof window !== "undefined" && "Notification" in window) {
                setNotifyPermission(Notification.permission);
            }
            setHydrated(true);
        });
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const onBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const onAppInstalled = () => setDeferredPrompt(null);
        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, []);

    const dismiss = useCallback(() => {
        try {
            localStorage.setItem(DISMISS_KEY, "1");
        } catch {
            /* ignore */
        }
        setDismissed(true);
    }, []);

    const onAllowAlerts = useCallback(async () => {
        if (!("Notification" in window)) return;
        try {
            const next = await Notification.requestPermission();
            setNotifyPermission(next);
            if (next === "denied" && !deferredPrompt) {
                try {
                    localStorage.setItem(DISMISS_KEY, "1");
                } catch {
                    /* ignore */
                }
                setDismissed(true);
            }
        } catch {
            setNotifyPermission(Notification.permission);
        }
    }, [deferredPrompt]);

    const onInstall = useCallback(async () => {
        if (!deferredPrompt) return;
        try {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } catch {
            /* ignore */
        }
        setDeferredPrompt(null);
        dismiss();
    }, [deferredPrompt, dismiss]);

    if (!hydrated || dismissed || isStandaloneDisplay()) return null;

    const showAlerts = typeof window !== "undefined" && "Notification" in window && notifyPermission === "default";
    const showInstall = !!deferredPrompt;

    if (!showAlerts && !showInstall) return null;

    return (
        <div
            className="rounded-2xl border-2 border-primary/35 bg-primary/10 px-5 py-4 shadow-lg backdrop-blur-sm"
            role="region"
            aria-label="Timer alerts and install"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1 pr-2">
                    <p className="text-sm font-black tracking-tight text-foreground">Stay on track — one-time setup</p>
                    <p className="text-xs text-muted leading-relaxed max-w-xl">
                        Turn on alerts so you hear when a focus or break block ends, even in another tab. Installing the app
                        adds ProdLytics to your home screen or taskbar for quicker access — no extra accounts required.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="btn-icon shrink-0 self-end sm:self-start text-muted hover:text-foreground"
                    aria-label="Dismiss"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {showAlerts ? (
                    <button type="button" onClick={() => void onAllowAlerts()} className="btn-primary inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5">
                        <BellRing size={16} className="shrink-0" />
                        Turn on alerts
                    </button>
                ) : null}
                {showInstall ? (
                    <button type="button" onClick={() => void onInstall()} className="btn-secondary inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5">
                        <Download size={16} className="shrink-0" />
                        Install app
                    </button>
                ) : null}
                <button type="button" onClick={dismiss} className="btn-secondary text-xs font-bold px-4 py-2.5">
                    Not now
                </button>
            </div>
        </div>
    );
}
