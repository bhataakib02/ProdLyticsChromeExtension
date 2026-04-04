/**
 * Seed professional default content for legal policies into SiteConfig.
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
        value: "ProdLytics Privacy Policy\n\n1. Introduction\nWelcome to ProdLytics. We value your privacy and are committed to protecting your personal data.\n\n2. Data Collection\nWe collect domain activity, page titles, and usage metrics to provide productivity analytics. We do not sell your data.\n\n3. Storage\nData is stored securely on our encrypted servers and processed locally in your browser for real-time insights.",
        description: "Public Privacy Policy content"
    },
    {
        key: "privacy_policy_date",
        value: "April 4, 2026",
        description: "Last updated date for Privacy Policy"
    },
    {
        key: "terms_of_service",
        value: "ProdLytics Terms of Service\n\n1. Acceptance\nBy using the extension, you agree to these legal terms.\n\n2. License\nWe grant you a personal, non-exclusive license to use the productivity tools.\n\n3. Pro Subscriptions\nPayments are processed via Stripe and are non-refundable unless required by law.",
        description: "Public Terms of Service content"
    },
    {
        key: "terms_of_service_date",
        value: "April 4, 2026",
        description: "Last updated date for Terms of Service"
    },
    {
        key: "cookie_policy",
        value: "ProdLytics Cookie Policy\n\n1. Use of Cookies\nWe use essential cookies for authentication and performance cookies for analytics.\n\n2. Opt-out\nYou can manage your cookie preferences in your browser settings.\n\n3. Extension Storage\nThe extension uses chrome.storage to cache your local tracking data.",
        description: "Public Cookie Policy content"
    },
    {
        key: "cookie_policy_date",
        value: "April 4, 2026",
        description: "Last updated date for Cookie Policy"
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
