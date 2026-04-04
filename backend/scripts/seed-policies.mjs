/**
 * Seed HIGH-QUALITY professional default content for legal policies into SiteConfig.
 * USES MARKDOWN SYNTX FOR BOLDING (**text**)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/prodlytics";

const SiteConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: String,
    updatedBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const SiteConfig = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);

const policies = [
    {
        key: "privacy_policy",
        value: `### 1. INTRODUCTION & SCOPE
This Privacy Policy outlines how **ProdLytics** ("we," "our," or "the Service") collects, processes, and protects your information across the ProdLytics Chrome extension and the related web application. We are committed to maintaining the highest standards of transparency regarding your data and productivity insights.

### 2. INFORMATION WE COLLECT
**2.1 Extension-Specific Data**
To provide accurate productivity analytics, the extension processes:
- **Domain Activity:** We monitor the active browser tab's hostname and page title to categorize your time (e.g., distinguishing between "Work/Productive" vs. "Social/Distracting").
- **Usage Metrics:** Duration of active sessions, scroll frequency, and intermittent engagement signals used exclusively to determine active vs. idle status.
- **Technical Data:** Extension version, browser type, and operating system for compatibility and bug reporting.

**2.2 Account & Authentication Data**
If you register for an account (e.g., via Google Auth), we store your email address and profile name to sync data across devices. We use locally stored cryptographic tokens (JWT) to authenticate your extension with your private dashboard safely.

### 3. HOW WE USE YOUR DATA
Your data is processed strictly for the following purposes:
- To generate the **AI Insights** and **AI Coach** productivity reports.
- To sync your **Goals** and **Focus Mode** settings across multiple browsers.
- To process pro-tier subscriptions through our secure payment partner, **Stripe**.
We do **NOT** sell your browsing history or personal data to third-party advertisers.

### 4. DATA SECURITY & STORAGE
We use industry-standard **SSL/TLS encryption** for all data in transit. Your productivity data is stored in secured, encrypted databases. Sensitive payment information is handled entirely by **Stripe** and never touches our servers.

### 5. YOUR RIGHTS (GDPR/CCPA)
You have the right to:
- Access and download a copy of your tracked data (available via the **Export Data** button).
- Request the deletion of your entire profile and tracked history.
- Opt-out of any non-essential data collection settings via the dashboard Preferences menu.

### 6. CONTACT US
For any privacy-related inquiries, please contact our support team at **support@prodlytics.com**.`,
        description: "Public Privacy Policy content"
    },
    {
        key: "terms_of_service",
        value: `### 1. ACCEPTANCE OF TERMS
By installing the **ProdLytics** Chrome extension or accessing the ProdLytics dashboard at **prodlytics.vercel.app**, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.

### 2. DESCRIPTION OF SERVICE
ProdLytics provides productivity tracking, goal management, and AI-driven insights. Features include time-tracking, focus sessions, and automated productivity nudges.

### 3. USER RESPONSIBILITIES
You are responsible for maintaining the confidentiality of your account credentials. You agree not to use the Service for any unlawful activities or to attempt to breach the security of our tracking infrastructure. You acknowledge that **Focus Mode** and other features may restrict access to certain websites to help you maintain productivity.

### 4. SUBSCRIPTIONS AND PAYMENTS
- **Pro Plan:** Access to advanced AI Coaching and unlimited goals requires a paid subscription.
- **Billing:** Payments are processed via **Stripe**. You agree to provide accurate billing information.
- **Refunds:** Subscription fees are generally non-refundable except where required by law or specified in the Stripe checkout flow.

### 5. INTELLECTUAL PROPERTY
The **ProdLytics** name, logo, extension source code (proprietary portions), and dashboard design are the exclusive property of our team. You may not reverse engineer the extension or attempt to scrape data from our servers.

### 6. LIMITATION OF LIABILITY
ProdLytics is provided **"as is"** without warranty of any kind. We are not liable for any productivity loss, data loss, or indirect damages resulting from the use or inability to use the Service.

### 7. TERMINATION
We reserve the right to suspend or terminate your access to the Service at any time for violation of these terms. You may delete your account and remove the extension at any time.

### 8. GOVERNING LAW
These terms are governed by the laws of **India**, without regard to conflict of law principles.`,
        description: "Public Terms of Service content"
    },
    {
        key: "cookie_policy",
        value: `### 1. UNDERSTANDING COOKIES & STORAGE
**ProdLytics** uses cookies and browser local storage to provide a seamless productivity experience. "Cookies" are small text files stored by your browser, while "Local Storage" is a more robust way to keep your settings saved directly on your computer.

### 2. HOW WE USE COOKIES
**2.1 Essential Cookies**
- **Authentication:** We use secure cookies to keep you logged into your dashboard across different sessions.
- **Security:** Anti-forgery tokens (CSRF) to protect your account from malicious attacks.

**2.2 Performance & Analytics**
- **Session State:** To remember which dashboard tab (Overview, Analytics, etc.) you were viewing.
- **Stripe Integration:** Our payment provider uses functional cookies to ensure secure transaction processing.

### 3. EXTENSION STORAGE (CHROME.STORAGE)
The Chrome extension uses the **chrome.storage.local** API to:
- Cache your website tracking data before it is synced to the cloud.
- Store your **Focus Mode** blocklist and current timer status to ensure it continues even if the browser is restarted.
- Maintain your anonymous **Device ID** to prevent data loss.

### 4. MANAGING YOUR PREFERENCES
Most web browsers allow you to control cookies through their settings. However, disabling all cookies may prevent you from logging into the dashboard or upgrading to the Pro plan.

### 5. CHANGES TO THIS POLICY
We may update this policy periodically to reflect changes in our technology or legal requirements. Please check the **"Last Updated"** date at the top for the latest version.`,
        description: "Public Cookie Policy content"
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for seeding...");

        for (const p of policies) {
            await SiteConfig.findOneAndUpdate(
                { key: p.key },
                { value: p.value, description: p.description },
                { upsert: true }
            );
            console.log(`Seeded: ${p.key}`);
        }

        console.log("Seed complete!");
        process.exit(0);
    } catch (err) {
        console.error("Seed failed:", err);
        process.exit(1);
    }
}

seed();
