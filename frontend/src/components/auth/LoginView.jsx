"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginView() {
    const { completeGoogleLogin, authError, clearAuthError } = useAuth();
    const btnRef = useRef(null);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

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
            {!clientId ? (
                <p className="max-w-md text-center text-sm text-amber-600 dark:text-amber-400">
                    Set <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and{" "}
                    <code className="rounded bg-muted px-1 py-0.5">JWT_SECRET</code> in{" "}
                    <code className="rounded bg-muted px-1 py-0.5">frontend/.env.local</code> (and on Vercel).
                </p>
            ) : (
                <div ref={btnRef} className="min-h-[40px]" />
            )}
            {authError ? (
                <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">{authError}</p>
            ) : null}
        </div>
    );
}
