"use client";

import { useEffect } from "react";

/** Registers a minimal service worker so the app can meet PWA install criteria in Chromium-based browsers. */
export function PwaRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
            /* non-HTTPS or blocked — ignore */
        });
    }, []);
    return null;
}
