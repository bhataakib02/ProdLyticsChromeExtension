"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const lastUpdated = "April 4, 2026";

function Section({ title, children }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
        </section>
    );
}

const DEFAULT_SUPPORT_EMAIL = "thefreelancer2076@gmail.com, crystalcclera@gmail.com";

export default function TermsOfServicePage() {
    const [dynamicContent, setDynamicContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/site-config?key=terms_of_service")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.value) setDynamicContent(data.value);
            })
            .catch(() => { })
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
                    <div className="mt-12 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                        {dynamicContent}
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

                            <Section title="5. Contact">
                                <p>For any questions regarding these terms, contact us at: {supportEmail}</p>
                            </Section>
                        </div>
                    </>
                )}

                <Link
                    className="mt-16 inline-flex items-center text-sm font-medium text-primary hover:opacity-80 transition-opacity"
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
