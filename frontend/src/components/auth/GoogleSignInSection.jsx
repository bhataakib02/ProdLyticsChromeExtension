"use client";

import { useEffect, useRef, useCallback, useState } from "react";

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

    const hide = configLoading || !clientId;
    if (hide) {
        return configLoading ? (
            <div className={`flex justify-center py-2 ${className}`}>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        ) : null;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div ref={btnRef} className="flex min-h-[40px] justify-center" />
            {configError ? <p className="text-center text-xs text-amber-600 dark:text-amber-400">{configError}</p> : null}
            {authError ? <p className="text-center text-xs text-red-600 dark:text-red-400">{authError}</p> : null}
        </div>
    );
}
