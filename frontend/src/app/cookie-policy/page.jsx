"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEFAULT_LAST_UPDATED = "April 4, 2026";

function Section({ title, children }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
        </section>
    );
}

const DEFAULT_SUPPORT_EMAIL = "thefreelancer2076@gmail.com, crystalcclera@gmail.com";

export default function CookiePolicyPage() {
    const [dynamicContent, setDynamicContent] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(DEFAULT_LAST_UPDATED);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/site-config?key=cookie_policy").then(res => res.ok ? res.json() : null),
            fetch("/api/site-config?key=cookie_policy_date").then(res => res.ok ? res.json() : null),
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
                    ProdLytics Cookie Policy
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
                            ProdLytics uses cookies and similar technologies to provide and improve our services.
                        </p>

                        <div className="mt-12 space-y-12">
                            <Section title="1. What are Cookies?">
                                <p>
                                    Cookies are small text files stored on your device that help us recognize you
                                    and remember your preferences.
                                </p>
                            </Section>

                            <Section title="2. Types of Cookies We Use">
                                <ul className="list-disc space-y-2 pl-5 text-sm">
                                    <li><strong>Essential:</strong> Required for the basic functioning of the Service (e.g., authentication).</li>
                                    <li><strong>Functional:</strong> Remember your settings and preferences.</li>
                                    <li><strong>Performance:</strong> Track how you use ProdLytics to help us improve.</li>
                                </ul>
                            </Section>

                            <Section title="3. Managing Cookies">
                                <p>
                                    You can control or reset your cookies through your browser settings.
                                    Note that disabling certain cookies may impact the Service's functionality.
                                </p>
                            </Section>

                            <Section title="4. Extension Storage">
                                <p>
                                    In addition to browser cookies, the ProdLytics extension uses <code>chrome.storage</code>
                                    to store local user state and tracking cache.
                                </p>
                            </Section>

                            <Section title="5. Contact">
                                <p>For cookie inquiries, contact us at: {supportEmail}</p>
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
