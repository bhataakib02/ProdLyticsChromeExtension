"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginView() {
    const { completeGoogleLogin, authError, clearAuthError } = useAuth();
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
                        setConfigError(
                            "Add JWT_SECRET (16+ characters) in Vercel → Settings → Environment Variables, then redeploy."
                        );
                    }
                } else {
                    setConfigError(
                        "Add GOOGLE_CLIENT_ID (Web application client ID from Google Cloud) on Vercel, then redeploy."
                    );
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
            clearAuthError();
            await completeGoogleLogin(cred);
        },
        [completeGoogleLogin, clearAuthError]
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
                    width: 280,
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

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
            <div className="max-w-md text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">ProdLytics</h1>
                <p className="mt-3 text-muted-foreground">
                    Sign in with Google to see your own focus data, goals, and blocklist. Each account is private.
                </p>
            </div>
            {configLoading ? (
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : !clientId ? (
                <div className="max-w-md space-y-2 text-center text-sm text-amber-600 dark:text-amber-400">
                    <p>
                        <strong>Vercel:</strong> Project → Settings → Environment Variables → add{" "}
                        <code className="rounded bg-muted px-1 py-0.5">GOOGLE_CLIENT_ID</code> (Web client ID) and{" "}
                        <code className="rounded bg-muted px-1 py-0.5">JWT_SECRET</code> (long random string, 16+
                        chars), then <strong>Redeploy</strong>.
                    </p>
                    {configError ? <p>{configError}</p> : null}
                    <p className="text-muted-foreground">
                        Local dev: put the same keys in <code className="rounded bg-muted px-1">frontend/.env.local</code>
                        . Optional: <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> (same
                        value as <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>) to skip the config
                        fetch.
                    </p>
                </div>
            ) : (
                <>
                    <div ref={btnRef} className="min-h-[40px]" />
                    {configError ? (
                        <p className="max-w-md text-center text-sm text-amber-600 dark:text-amber-400">{configError}</p>
                    ) : null}
                </>
            )}
            {authError ? (
                <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">{authError}</p>
            ) : null}
        </div>
    );
}
