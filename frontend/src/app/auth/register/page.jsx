"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterRedirectInner() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const raw = searchParams.get("callbackUrl") || "/insights/ai-coach";
        const safe = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/insights/ai-coach";
        router.replace(`/auth/login?register=1&callbackUrl=${encodeURIComponent(safe)}`);
    }, [router, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
            Redirecting to sign up…
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
                    Loading…
                </div>
            }
        >
            <RegisterRedirectInner />
        </Suspense>
    );
}
