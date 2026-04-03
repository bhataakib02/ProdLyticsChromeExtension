"use client";

import { useState } from "react";
import Link from "next/link";

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
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
            <h1 className="text-2xl font-bold text-foreground">One-time admin setup</h1>
            <p className="mt-2 text-sm text-muted">
                Creates <code className="rounded bg-muted px-1">admin@gmail.com</code> in your MongoDB (same{" "}
                <code className="rounded bg-muted px-1">MONGO_URI</code> as this app). Paste{" "}
                <code className="rounded bg-muted px-1">ADMIN_SETUP_SECRET</code> from{" "}
                <code className="rounded bg-muted px-1">frontend/.env.local</code>, then submit once.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-muted">ADMIN_SETUP_SECRET</label>
                    <input
                        type="password"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-background px-3 py-2 text-sm outline-none"
                        placeholder="Value from .env.local"
                        autoComplete="off"
                        required
                    />
                </div>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Display name"
                    className="w-full rounded-xl border border-white/15 bg-background px-3 py-2 text-sm outline-none"
                />
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-xl border border-white/15 bg-background px-3 py-2 text-sm outline-none"
                    required
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="w-full rounded-xl border border-white/15 bg-background px-3 py-2 text-sm outline-none"
                    required
                    minLength={6}
                />
                {err ? <p className="text-sm text-red-500">{err}</p> : null}
                {msg ? <p className="text-sm text-emerald-500">{msg}</p> : null}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                    {loading ? "Saving…" : "Create / update admin user"}
                </button>
            </form>

            <Link href="/auth/login" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">
                Back to sign in
            </Link>
        </div>
    );
}
