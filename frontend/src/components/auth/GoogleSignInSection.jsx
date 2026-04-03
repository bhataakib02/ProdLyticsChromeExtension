"use client";

import { useEffect, useRef, useCallback, useState } from "react";

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
            />
        </svg>
    );
}

/**
 * Renders Google Identity Services button; calls onIdToken(idToken) with the credential JWT.
 */
export function GoogleSignInSection({ onIdToken, authError, clearAuthError, className = "" }) {
    const btnRef = useRef(null);
    const [clientId, setClientId] = useState(() => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "");
    const [configLoading, setConfigLoading] = useState(() => !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    const [configError, setConfigError] = useState("");

    useEffect(() => {
        if (clientId) {
            setConfigLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/auth/config", { cache: "no-store" });
                const data = await res.json();
                if (cancelled) return;
                if (data.googleClientId) {
                    setClientId(data.googleClientId);
                    if (!data.authReady) {
                        setConfigError("Server auth is not fully configured (JWT_SECRET).");
                    }
                } else {
                    setConfigError("Google sign-in is not configured (GOOGLE_CLIENT_ID).");
                }
            } catch {
                if (!cancelled) setConfigError("Could not load sign-in configuration.");
            } finally {
                if (!cancelled) setConfigLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [clientId]);

    const handleCredential = useCallback(
        async (response) => {
            const cred = response?.credential;
            if (!cred) return;
            clearAuthError?.();
            await onIdToken(cred);
        },
        [onIdToken, clearAuthError]
    );

    useEffect(() => {
        if (!clientId || typeof window === "undefined") return;

        const init = () => {
            if (!window.google?.accounts?.id) return;
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredential,
                auto_select: false,
            });
            if (btnRef.current) {
                window.google.accounts.id.renderButton(btnRef.current, {
                    theme: "filled_blue",
                    size: "large",
                    text: "signin_with",
                    shape: "pill",
                    width: 320,
                });
            }
        };

        const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existing) {
            if (window.google?.accounts?.id) init();
            else existing.addEventListener("load", init);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = init;
        document.head.appendChild(script);
    }, [clientId, handleCredential]);

    if (configLoading) {
        return (
            <div className={`flex justify-center py-2 ${className}`}>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    const handleClickPlaceholder = () => {
        if (!clientId) {
            alert("Google Sign-In is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env file.");
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-col items-center gap-3">
                {clientId ? (
                    <div ref={btnRef} className="flex min-h-[44px] w-full justify-center" />
                ) : (
                    <button
                        type="button"
                        onClick={handleClickPlaceholder}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-ui bg-background px-4 py-3 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-muted/10 active:scale-[0.98]"
                    >
                        <GoogleIcon />
                        <span>Sign in with Google</span>
                    </button>
                )}

                {configError ? (
                    <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-center text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {configError}
                    </div>
                ) : null}

                {authError ? (
                    <div className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-[11px] font-medium text-red-600 dark:text-red-400">
                        {authError}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
