"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_LAST_UPDATED = "April 4, 2026";

function Section({ title, children }) {
    return (
        <section className="space-y-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
        </section>
    );
}

function renderMarkdown(text) {
    if (!text) return null;
    
    return text.split("\n\n").map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headers
        if (trimmed.startsWith("### ")) {
            return (
                <h2 key={i} className="text-xl font-bold tracking-tight text-foreground mt-10 mb-4 First:mt-0">
                    {trimmed.replace("### ", "")}
                </h2>
            );
        }

        // Bolding (simple)
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        const rendered = parts.map((part, j) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
            }
            return part;
        });

        return (
            <p key={i} className="text-sm leading-relaxed text-foreground/80 mb-4 last:mb-0">
                {rendered}
            </p>
        );
    });
}

const DEFAULT_SUPPORT_EMAIL = "thefreelancer2076@gmail.com, crystalcclera@gmail.com";

export default function TermsOfServicePage() {
    const [dynamicContent, setDynamicContent] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(DEFAULT_LAST_UPDATED);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/site-config?key=terms_of_service").then(res => res.ok ? res.json() : null),
            fetch("/api/site-config?key=terms_of_service_date").then(res => res.ok ? res.json() : null),
        ]).then(([contentData, dateData]) => {
            if (contentData?.value) setDynamicContent(contentData.value);
            if (dateData?.value) setLastUpdated(dateData.value);
        }).catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const supportEmail = (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPPORT_EMAIL : null) || DEFAULT_SUPPORT_EMAIL;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Legal
                </p>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                    ProdLytics Terms of Service
                </h1>
                <p className="mt-3 text-sm text-foreground/70">
                    <strong>Last updated:</strong> {lastUpdated}
                </p>

                {dynamicContent ? (
                    <div className="mt-12">
                        {renderMarkdown(dynamicContent)}
                    </div>
                ) : (
                    <>
                        <p className="mt-6 text-sm leading-relaxed text-foreground/85">
                            By using <strong>ProdLytics</strong>, you agree to these terms. Please read them carefully.
                        </p>

                        <div className="mt-12 space-y-12">
                            <Section title="1. Acceptance of Terms">
                                <p>
                                    By accessing or using the ProdLytics Chrome extension and web application,
                                    you agree to be bound by these Terms of Service and all applicable laws and regulations.
                                </p>
                            </Section>

                            <Section title="2. Description of Service">
                                <p>
                                    ProdLytics provides productivity tracking, analytics, and AI-driven insights
                                    to help users optimize their time and focus.
                                </p>
                            </Section>

                            <Section title="3. User Accounts">
                                <p>
                                    You are responsible for maintaining the confidentiality of your account credentials
                                    and for all activities that occur under your account.
                                </p>
                            </Section>

                            <Section title="4. Pro Subscriptions">
                                <p>
                                    Certain features require a paid subscription. All payments are processed securely
                                    via Stripe. Subscriptions automatically renew unless canceled.
                                </p>
                            </Section>
                        </div>
                    </>
                )}

                {/* Contact section — always visible */}
                <div className="mt-16 border-t border-foreground/10 pt-10">
                    <h2 className="text-xl font-bold tracking-tight text-foreground mb-3">Contact Us &amp; Data Access</h2>
                    <p className="text-sm text-foreground/80 mb-6">
                        If you have any questions about these Terms, or wish to exercise your data rights, please contact our support team:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg bg-foreground/5 p-4 border border-foreground/10">
                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">Primary Support</p>
                            <a className="text-sm font-medium text-primary hover:underline" href="mailto:thefreelancer2076@gmail.com">
                                thefreelancer2076@gmail.com
                            </a>
                        </div>
                        <div className="rounded-lg bg-foreground/5 p-4 border border-foreground/10">
                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">Secondary Support</p>
                            <a className="text-sm font-medium text-primary hover:underline" href="mailto:crystalclear@gmail.com">
                                crystalclear@gmail.com
                            </a>
                        </div>
                    </div>
                    <p className="mt-4 text-sm italic text-foreground/60">
                        Users may reach out to either address above for any legal inquiries or data-related assistance.
                    </p>
                </div>

                <Link
                    className="mt-10 inline-flex items-center text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                    href="/"
                >
                    <span>Return to ProdLytics Dashboard</span>
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    );
}
