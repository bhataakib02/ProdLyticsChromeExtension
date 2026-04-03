"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

/**
 * One-time: creates admin in the same DB as the app.
 * Uses the same secret as ADMIN_SETUP_SECRET in frontend/.env.local
 */
export default function SetupAdminPage() {
    const [secret, setSecret] = useState("");
    const [email, setEmail] = useState("admin@gmail.com");
    const [password, setPassword] = useState("admin123");
    const [name, setName] = useState("Admin");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setMsg("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/setup-admin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-setup-secret": secret.trim(),
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password: password.trim(),
                    name: name.trim() || "Admin",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || `Request failed (${res.status})`);
            }
            setMsg(data.message || "Done. You can sign in now.");
        } catch (e) {
            setErr(e.message || "Setup failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:px-6 sm:py-20">
            {/* Ambient Background */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -right-32 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
                <div className="absolute -bottom-24 -left-32 h-72 w-72 rounded-full bg-secondary/15 blur-[100px]" />
            </div>

            <div className="relative mx-auto w-full max-w-[420px]">
                <div className="glass-card rounded-[32px] border border-ui p-8 shadow-2xl shadow-black/25 backdrop-blur-3xl sm:p-10">
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                            <Shield size={28} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">Admin Initialization</h1>
                        <p className="mt-2 text-sm font-medium text-muted">
                            Complete the one-time deployment of your root administrative account.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted">Deployment Secret</label>
                            <input
                                type="password"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                className="w-full rounded-xl border border-ui bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
                                placeholder="Value from .env.local"
                                autoComplete="off"
                                required
                            />
                        </div>
                        
                        <div className="space-y-3 pt-2">
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full Name"
                                className="w-full rounded-xl border border-ui bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full rounded-xl border border-ui bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
                                required
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Secure Password"
                                className="w-full rounded-xl border border-ui bg-background/50 px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-4 focus:ring-primary/10"
                                required
                                minLength={6}
                            />
                        </div>

                        {err ? (
                            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
                                {err}
                            </p>
                        ) : null}
                        {msg ? (
                            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                                {msg}
                            </p>
                        ) : null}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-primary px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? "Decrypting…" : "Deploy Admin"}
                        </button>
                    </form>

                    <div className="mt-8 border-t border-ui pt-8 text-center">
                        <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-primary underline-offset-8 hover:underline">
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
