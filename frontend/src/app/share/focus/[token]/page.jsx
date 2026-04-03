"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SharedFocusTrendPage() {
    const params = useParams();
    const token = typeof params?.token === "string" ? params.token : "";
    const [data, setData] = useState(null);
    const [err, setErr] = useState("");

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/share/focus/${encodeURIComponent(token)}`);
                if (!res.ok) throw new Error("notfound");
                const j = await res.json();
                if (!cancelled) setData(j);
            } catch {
                if (!cancelled) setErr("This share link is inactive or invalid.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    if (err) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
                <p className="text-foreground font-bold">{err}</p>
                <Link href="/" className="mt-4 text-primary text-sm font-bold underline">
                    Back to ProdLytics
                </Link>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    const weeks = Array.isArray(data.weeks) ? data.weeks : [];
    const max = Math.max(1, ...weeks.map((w) => Number(w.score) || 0));

    return (
        <div className="min-h-screen bg-background px-4 py-10">
            <div className="mx-auto max-w-lg">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted">ProdLytics · Shared view</p>
                <h1 className="mt-2 font-serif text-2xl font-bold text-foreground tracking-tight">
                    {data.displayName}&apos;s focus trend
                </h1>
                <p className="mt-2 text-xs font-medium text-muted leading-relaxed">
                    Weekly focus score only. No websites or browsing history are shared.
                </p>
                <div className="mt-8 space-y-4 rounded-2xl border border-ui-muted bg-foreground/[0.03] p-4">
                    {weeks.map((w) => (
                        <div key={w.label}>
                            <div className="flex justify-between text-xs font-bold text-foreground/85 mb-1">
                                <span>{w.label}</span>
                                <span>{w.score}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                                <div className="h-full bg-primary transition-all" style={{ width: `${(Number(w.score) / max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-6 text-center text-[10px] text-muted">
                    Owner can turn this off anytime in AI Coach → Accountability partner.
                </p>
                <Link href="/" className="mt-4 block text-center text-xs font-bold text-primary underline">
                    Get ProdLytics
                </Link>
            </div>
        </div>
    );
}
