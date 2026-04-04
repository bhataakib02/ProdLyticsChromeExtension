import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/prodlytics";

const SiteConfigSchema = new mongoose.Schema({
    key: String,
    value: mongoose.Schema.Types.Mixed
});

const SiteConfig = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const configs = await SiteConfig.find({});
        console.log("DB Content:", JSON.stringify(configs, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
