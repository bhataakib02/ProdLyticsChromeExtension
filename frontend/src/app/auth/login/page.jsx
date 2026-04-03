"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoogleSignInSection } from "@/components/auth/GoogleSignInSection";

const LAST_EMAIL_KEY = "prodlytics_last_email";

function LoginPageInner() {
    const { applySessionToken, completeGoogleLogin, authError, clearAuthError } = useAuth();
    const router = useRouter();
    const params = useSearchParams();
    const callbackUrl = useMemo(() => {
        const raw = params.get("callbackUrl");
        if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) return raw;
        return "/upgrade";
    }, [params]);
    const emailFromUrl = useMemo(() => {
        const e = params.get("email");
        return typeof e === "string" ? e.trim() : "";
    }, [params]);
    const openAsRegister =
        params.get("register") === "1" || params.get("mode") === "register" || params.get("mode") === "signup";
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [isRegistering, setIsRegistering] = useState(openAsRegister);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const saved = localStorage.getItem(LAST_EMAIL_KEY) || "";
        const initial = emailFromUrl || saved;
        if (initial) {
            setForm((s) => ({ ...s, email: initial }));
        }
    }, [emailFromUrl]);

    async function handleCredentialsSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (isRegistering) {
                const anonToken =
                    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                const regRes = await fetch("/api/auth/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(anonToken ? { Authorization: `Bearer ${anonToken}` } : {}),
                    },
                    body: JSON.stringify(form),
                });
                const regData = await regRes.json();
                if (!regRes.ok) throw new Error(regData.error || "Sign up failed.");
                if (regData.upgraded && regData.accessToken) {
                    await applySessionToken(regData.accessToken);
                    const role = String(regData.user?.role || "user");
                    router.push(role === "admin" ? "/admin" : callbackUrl);
                    router.refresh();
                    return;
                }
            }

            const loginRes = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: String(form.email || "").trim().toLowerCase(),
                    password: String(form.password || "").trim(),
                }),
            });
            const loginData = await loginRes.json();
            if (!loginRes.ok || !loginData?.accessToken) {
                throw new Error(loginData?.error || "Invalid credentials.");
            }
            const emailNorm = String(form.email || "").trim().toLowerCase();
            if (emailNorm) {
                try {
                    localStorage.setItem(LAST_EMAIL_KEY, emailNorm);
                } catch {
                    /* ignore */
                }
            }
            await applySessionToken(loginData.accessToken);
            const role = String(loginData.user?.role || "user");
            const destination = role === "admin" ? "/admin" : callbackUrl;
            router.push(destination);
            router.refresh();
        } catch (err) {
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    const inputClass =
        "w-full rounded-xl border border-ui bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition-shadow focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background px-4 py-10 sm:px-6 sm:py-14">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -right-32 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-[90px]" />
                <div className="absolute -bottom-24 -left-32 h-72 w-72 rounded-full bg-secondary/20 blur-[90px]" />
            </div>

            <div className="relative mx-auto w-full max-w-[420px]">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:text-primary"
                >
                    <ArrowLeft size={14} aria-hidden />
                    Back to dashboard
                </Link>

                <div className="glass-card mt-6 rounded-[28px] border-2 border-ui p-8 shadow-lg shadow-black/25 sm:p-10">
                    <div className="mb-6 flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15">
                            <Shield className="text-primary" size={22} aria-hidden />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground">
                                {isRegistering ? "Create your account" : "Welcome back"}
                            </h1>
                            <p className="mt-1 text-sm font-medium leading-relaxed text-muted">
                                {isRegistering
                                    ? "Sign up with email and password to save your progress and unlock Premium when you’re ready."
                                    : "Sign in with the email and password for your ProdLytics account."}
                            </p>
                        </div>
                    </div>

                    <GoogleSignInSection
                        onIdToken={async (idToken) => {
                            const ok = await completeGoogleLogin(idToken);
                            if (ok) router.push(callbackUrl);
                        }}
                        authError={authError}
                        clearAuthError={clearAuthError}
                        className="mt-4"
                    />

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center" aria-hidden>
                            <span className="w-full border-t border-ui" />
                        </div>
                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="bg-background px-3 text-muted">Or email &amp; password</span>
                        </div>
                    </div>

                    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                        {isRegistering ? (
                            <div>
                                <label htmlFor="auth-name" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                    Full name
                                </label>
                                <input
                                    id="auth-name"
                                    value={form.name}
                                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Ada Lovelace"
                                    autoComplete="name"
                                    className={inputClass}
                                    required
                                />
                            </div>
                        ) : null}
                        <div>
                            <label htmlFor="auth-email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                Email
                            </label>
                            <input
                                id="auth-email"
                                value={form.email}
                                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                                placeholder="you@example.com"
                                type="email"
                                autoComplete="email"
                                className={inputClass}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="auth-password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="auth-password"
                                    value={form.password}
                                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                                    placeholder={isRegistering ? "At least 6 characters" : "Your password"}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete={isRegistering ? "new-password" : "current-password"}
                                    className={`${inputClass} pr-12`}
                                    required
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                                </button>
                            </div>
                        </div>

                        {error ? (
                            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200" role="alert">
                                {error}
                            </p>
                        ) : null}

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-95 disabled:opacity-50"
                        >
                            {loading ? "Please wait…" : isRegistering ? "Create account & continue" : "Sign in"}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-ui pt-6 text-center">
                        <button
                            type="button"
                            onClick={() => setIsRegistering((s) => !s)}
                            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                            {isRegistering ? "Already have an account? Sign in" : "New here? Create an account"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm text-muted">Loading…</div>
            }
        >
            <LoginPageInner />
        </Suspense>
    );
}
