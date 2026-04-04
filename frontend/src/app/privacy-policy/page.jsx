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

export default function PrivacyPolicyPage() {
    const [dynamicContent, setDynamicContent] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(DEFAULT_LAST_UPDATED);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/site-config?key=privacy_policy").then(res => res.ok ? res.json() : null),
            fetch("/api/site-config?key=privacy_policy_date").then(res => res.ok ? res.json() : null),
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
                    ProdLytics Privacy Policy
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
                            This policy describes how the <strong>ProdLytics</strong> Chrome extension and
                            related <strong>ProdLytics web application</strong> (“<strong>Services</strong>”)
                            handle information. By using the Services, you agree to this policy.
                        </p>

                        <div className="mt-12 space-y-12">
                            <Section title="1. Introduction & Scope">
                                <p>
                                    This Privacy Policy Outlines how <strong>ProdLytics</strong> ("we," "our," or "the Service")
                                    collects, processes, and protects your information across the ProdLytics Chrome extension
                                    and the related web application. We are committed to maintaining the highest standards of
                                    transparency regarding your data and productivity insights.
                                </p>
                            </Section>

                            <Section title="2. Information We Collect">
                                <h3 className="text-base font-medium text-foreground">2.1 Extension-Specific Data</h3>
                                <p>To provide accurate productivity analytics, the extension processes:</p>
                                <ul className="list-disc space-y-2 pl-5 text-sm">
                                    <li>
                                        <strong>Domain Activity:</strong> We monitor the active browser tab's hostname and page title
                                        to categorize your time (e.g., distinguishing between "Work/Productive" vs. "Social/Distracting").
                                    </li>
                                    <li>
                                        <strong>Usage Metrics:</strong> Duration of active sessions, scroll frequency, and intermittent
                                        engagement signals used exclusively to determine active vs. idle states.
                                    </li>
                                    <li>
                                        <strong>Technical Data:</strong> Extension version, browser type, and operating system for
                                        compatibility and bug reporting.
                                    </li>
                                </ul>

                                <h3 className="pt-4 text-base font-medium text-foreground">
                                    2.2 Account & Authentication Data
                                </h3>
                                <ul className="list-disc space-y-2 pl-5 text-sm">
                                    <li>
                                        <strong>Identity Information:</strong> If you register for an account (e.g., via Google Auth),
                                        we store your email address and profile name to sync data across devices.
                                    </li>
                                    <li>
                                        <strong>Session Tokens:</strong> Locally stored cryptographic tokens used to authenticate
                                        your extension with your private dashboard.
                                    </li>
                                </ul>
                            </Section>

                            <Section title="3. How We Use Your Data">
                                <p>Your data is processed strictly for the following purposes:</p>
                                <ul className="list-disc space-y-2 pl-5 text-sm">
                                    <li><strong>Analytics:</strong> Generating personalized productivity heatmaps and trend reports.</li>
                                    <li><strong>AI Insights:</strong> Our local/backend AI models analyze habit patterns to suggest
                                        optimal focus times and suggest goal adjustments.</li>
                                    <li><strong>Functional Requirements:</strong> Enforcing custom "Focus Mode" site blocks and
                                        delivering goal-completion notifications.</li>
                                </ul>
                                <p className="mt-4 font-medium text-primary/90">
                                    We do NOT sell your browsing history to third-party data brokers or use your
                                    activity for targeted advertising.
                                </p>
                            </Section>

                            <Section title="4. Data Storage & Retention">
                                <ul className="list-disc space-y-2 pl-5 text-sm">
                                    <li>
                                        <strong>Local Cache:</strong> High-frequency tracking data is stored in your
                                        <code>chrome.storage.local</code> area and is cleared upon extension uninstallation.
                                    </li>
                                    <li>
                                        <strong>Cloud Storage:</strong> Synchronized data is stored on secure servers. We retain
                                        summarized productivity data as long as your account is active.
                                    </li>
                                </ul>
                            </Section>

                            <Section title="5. Security Measures">
                                <p>
                                    We implement robust security protocols, including <strong>TLS/SSL encryption</strong> for
                                    all data in transit and <strong>at-rest encryption</strong> for cloud databases. Access to
                                    user data by our internal team is strictly logged and restricted to essential service
                                    maintenance and bug resolution.
                                </p>
                            </Section>

                            <Section title="6. Third-Party Services">
                                <p>
                                    ProdLytics may utilize trusted third-party providers for infrastructure (e.g., Vercel, MongoDB)
                                    and authentication (e.g., Google OAuth). These providers are restricted from using your
                                    data for any purpose other than providing these essential services to us.
                                </p>
                            </Section>

                            <Section title="7. Global User Rights (GDPR/CCPA)">
                                <p>Regardless of your location, we aim to provide global standards of data autonomy:</p>
                                <ul className="list-disc space-y-2 pl-5 text-sm">
                                    <li><strong>Right of Access:</strong> You can view all tracked activity directly via your dashboard.</li>
                                    <li><strong>Right to Erasure:</strong> You may request full account and tracking data deletion
                                        by contacting us at the address below.</li>
                                    <li><strong>Data Portability:</strong> Users may request a copy of their productivity history
                                        in a machine-readable format.</li>
                                </ul>
                            </Section>

                            <Section title="8. Children's Privacy">
                                <p>
                                    ProdLytics is not intended for use by individuals under the age of 13. We do not knowingly
                                    collect personal information from children. If we become aware of accidental collection,
                                    we will take immediate steps to delete the data.
                                </p>
                            </Section>
                        </div>
                    </>
                )}

                {/* Contact section — always visible regardless of dynamic content */}
                <div className="mt-16 border-t border-foreground/10 pt-10">
                    <h2 className="text-xl font-bold tracking-tight text-foreground mb-3">Contact Us &amp; Data Access</h2>
                    <p className="text-sm text-foreground/80 mb-6">
                        If you have any questions or wish to exercise your data rights (access, portability, or deletion), please contact our support team:
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
                        Users may request a full copy of their tracked data or permanent account deletion by emailing either address above.
                    </p>
                </div>

                <p className="mt-10 border-t border-foreground/10 pt-8 text-xs leading-relaxed text-foreground/55">
                    This policy is provided for transparency and is not legal advice. Consult a lawyer
                    if you need GDPR/CCPA-specific wording for your jurisdiction.
                </p>
                <Link
                    className="mt-6 inline-flex items-center text-sm font-medium text-primary hover:opacity-80 transition-opacity"
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
