/**
 * Resets admin@gmail.com password via Mongoose (runs pre-save hash hook).
 * Run from repo root: node frontend/scripts/reset-admin-password.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

function loadMongoUri() {
    if (process.env.MONGO_URI) return process.env.MONGO_URI.trim();
    try {
        const txt = readFileSync(envPath, "utf8");
        const line = txt.split(/\r?\n/).find((l) => l.startsWith("MONGO_URI="));
        if (!line) return "";
        return line.slice("MONGO_URI=".length).trim();
    } catch {
        return "";
    }
}

const uri = loadMongoUri();
if (!uri) {
    console.error("Set MONGO_URI or add frontend/.env.local with MONGO_URI=");
    process.exit(1);
}

const { default: User } = await import("../../backend/models/User.js");

await mongoose.connect(uri);

const email = "admin@gmail.com";
let user = await User.findOne({ email });
if (!user) {
    await User.create({
        name: "Admin",
        email,
        password: "admin123",
        role: "admin",
        subscription: "free",
        isPremium: false,
        isAnonymous: false,
    });
    console.log("Created admin user:", email);
} else {
    user.password = "admin123";
    user.role = "admin";
    user.subscription = "free";
    user.isPremium = false;
    user.isAnonymous = false;
    await user.save();
    console.log("Reset password for:", email);
}

await mongoose.disconnect();
console.log("Done.");
