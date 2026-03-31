import Link from "next/link";

export const metadata = {
    title: "Privacy Policy | ProdLytics",
    description:
        "How the ProdLytics Chrome extension and web application collect, use, and store data.",
};

const lastUpdated = "March 31, 2026";

function Section({ title, children }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-foreground/85">{children}</div>
        </section>
    );
}

const DEFAULT_SUPPORT_EMAIL = "aakibbhat01@gmail.com";

export default function PrivacyPolicyPage() {
    const supportEmail = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL).trim();
    const dataRegion = (process.env.NEXT_PUBLIC_DATA_REGION || "").trim();

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
                <p className="mt-6 text-sm leading-relaxed text-foreground/85">
                    This policy describes how the <strong>ProdLytics</strong> Chrome extension and
                    related <strong>ProdLytics web application</strong> (“<strong>Services</strong>”)
                    handle information. By using the Services, you agree to this policy.
                </p>

                <div className="mt-12 space-y-12">
                    <Section title="1. Who we are">
                        <p>
                            ProdLytics is a productivity tool that helps you understand how you spend
                            time in the browser and manage focus goals. The extension works together
                            with the ProdLytics dashboard website.
                        </p>
                    </Section>

                    <Section title="2. What we collect">
                        <h3 className="text-base font-medium text-foreground">2.1 Browsing activity (extension)</h3>
                        <p>When you use the extension, it may process:</p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                <strong>Hostname</strong> (and related URL context) of the sites you
                                visit while the extension is active
                            </li>
                            <li>
                                <strong>Time spent</strong> on those sites (aggregated into sessions)
                            </li>
                            <li>
                                <strong>Page title</strong> (where available), used to help categorize
                                sites (e.g. productive vs. distracting)
                            </li>
                            <li>
                                <strong>Light engagement signals</strong> (such as scroll and click
                                counts) used only to estimate engagement for insights—not to read page
                                content for advertising
                            </li>
                        </ul>
                        <p>
                            We do <strong>not</strong> sell your browsing history. We do{" "}
                            <strong>not</strong> use it to show third-party ads inside the extension.
                        </p>

                        <h3 className="pt-4 text-base font-medium text-foreground">
                            2.2 Account and authentication (dashboard + extension)
                        </h3>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                If you use the <strong>dashboard</strong>, you may sign in (e.g. with
                                Google) or receive an <strong>anonymous session</strong> tied to your
                                browser.
                            </li>
                            <li>
                                The extension may store a <strong>session token</strong> locally so it
                                can sync with your account on the ProdLytics backend.
                            </li>
                        </ul>

                        <h3 className="pt-4 text-base font-medium text-foreground">2.3 Optional notifications</h3>
                        <p>
                            If you enable related features, the extension may show{" "}
                            <strong>Chrome notifications</strong> (for example, focus or break
                            reminders, or goal completion alerts). You can turn off or limit
                            notifications in Chrome’s extension settings.
                        </p>
                    </Section>

                    <Section title="3. Where data is stored">
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                Data you sync is stored on <strong>servers</strong> operated for
                                ProdLytics (for example, your deployed backend / database).
                            </li>
                            <li>
                                Some data is kept <strong>locally in your browser</strong> (Chrome{" "}
                                <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">storage</code>)
                                for the extension to work offline-first where possible (e.g. cached
                                goals, blocklist, session token).
                            </li>
                        </ul>
                        <p>
                            {dataRegion ? (
                                <>
                                    For this deployment, data is processed/stored in{" "}
                                    <strong>{dataRegion}</strong> (as configured by the operator).
                                </>
                            ) : (
                                <>
                                    The exact hosting region depends on your deployment (e.g. cloud
                                    provider and database region). Operators may document a specific
                                    region in this policy by setting{" "}
                                    <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">
                                        NEXT_PUBLIC_DATA_REGION
                                    </code>{" "}
                                    for the dashboard build.
                                </>
                            )}
                        </p>
                    </Section>

                    <Section title="4. Who can see your data">
                        <ul className="list-disc space-y-2 pl-5">
                            <li>
                                <strong>You</strong> can see your own data in the ProdLytics dashboard
                                when signed in (or in your anonymous session).
                            </li>
                            <li>
                                <strong>Operators</strong> of the ProdLytics service may access data
                                only as needed to run, secure, and improve the service (e.g. debugging,
                                abuse prevention), and should follow reasonable security practices.
                            </li>
                            <li>
                                We do <strong>not</strong> intentionally share your personal browsing
                                history with unrelated third parties for their marketing.
                            </li>
                        </ul>
                        <p>
                            If you use <strong>Google Sign-In</strong>, Google’s privacy policy also
                            applies to the sign-in flow.
                        </p>
                    </Section>

                    <Section title="5. How we use data">
                        <p>We use the information above to:</p>
                        <ul className="list-disc space-y-2 pl-5">
                            <li>Show time and focus statistics in the dashboard</li>
                            <li>Support goals, blocklists / focus mode, and insights you configure</li>
                            <li>Sync settings between the extension and the web app for the same account</li>
                        </ul>
                    </Section>

                    <Section title="6. Security">
                        <p>
                            We use industry-common measures such as <strong>HTTPS</strong> for API
                            traffic and <strong>authentication tokens</strong> for API access. No
                            method of transmission or storage is 100% secure; you should protect your
                            device and Google account.
                        </p>
                    </Section>

                    <Section title="7. Your choices">
                        <ul className="list-disc space-y-2 pl-5">
                            <li>You can uninstall the extension at any time.</li>
                            <li>
                                You can clear extension data from Chrome (Extension details → Storage
                                / Site access as applicable).
                            </li>
                            <li>
                                You can disconnect or stop using the dashboard; use the support
                                contact below for account or data deletion requests where applicable.
                            </li>
                        </ul>
                        <p>
                            <strong>Support / data requests:</strong>{" "}
                            {supportEmail ? (
                                <a
                                    className="font-medium text-primary underline underline-offset-2"
                                    href={`mailto:${supportEmail}`}
                                >
                                    {supportEmail}
                                </a>
                            ) : (
                                <span className="text-foreground/80">
                                    The publisher should set{" "}
                                    <code className="rounded bg-foreground/10 px-1 py-0.5 text-xs">
                                        NEXT_PUBLIC_SUPPORT_EMAIL
                                    </code>{" "}
                                    on the dashboard deployment so a contact email appears here. Until
                                    then, use the{" "}
                                    <strong>Support</strong> tab on the Chrome Web Store listing for
                                    this extension.
                                </span>
                            )}
                        </p>
                    </Section>

                    <Section title="8. Children">
                        <p>
                            The Services are not directed at children under 13 (or the minimum age in
                            your jurisdiction). Do not use the Services if you are not old enough to
                            consent in your region.
                        </p>
                    </Section>

                    <Section title="9. Changes">
                        <p>
                            We may update this policy. The “Last updated” date will change when we do.
                            Continued use after changes means you accept the updated policy.
                        </p>
                    </Section>

                    <Section title="10. Contact">
                        <p>
                            <strong>ProdLytics</strong>
                        </p>
                        {supportEmail ? (
                            <p>
                                <a
                                    className="font-medium text-primary underline underline-offset-2"
                                    href={`mailto:${supportEmail}`}
                                >
                                    {supportEmail}
                                </a>
                            </p>
                        ) : null}
                        <p>
                            <Link
                                className="font-medium text-primary underline underline-offset-2"
                                href="/"
                            >
                                Open ProdLytics dashboard
                            </Link>
                        </p>
                    </Section>
                </div>

                <p className="mt-16 border-t border-foreground/10 pt-8 text-xs leading-relaxed text-foreground/55">
                    This policy is provided for transparency and is not legal advice. Consult a lawyer
                    if you need GDPR/CCPA-specific wording for your jurisdiction.
                </p>
            </div>
        </div>
    );
}
