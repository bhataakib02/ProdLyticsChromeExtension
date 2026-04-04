import crypto from "crypto";
import { NextResponse } from "next/server";
import dbConnect from "../../../../../backend/db/mongodb.js";
import UserSettings from "../../../../../backend/models/UserSettings.js";
import Preference from "../../../../../backend/models/Preference.js";
import { getUserIdFromRequest } from "@/lib/apiUser";

function newPartnerShareToken() {
    return crypto.randomBytes(18).toString("base64url").replace(/=/g, "");
}

const DEFAULTS = {
    goals: {
        dailyHours: 4,
        enableGoalTracking: true,
        enableStreaks: true,
        enableDeepWorkTracking: true,
    },
    aiSettings: {
        enabled: true,
        predictive: true,
        suggestions: true,
        cognitiveLoad: true,
        frequency: "daily",
    },
    notifications: {
        browser: true,
        distractionAlerts: true,
        goalReminders: true,
        weeklyReports: true,
    },
    privacy: {
        trackingEnabled: true,
        pauseTrackingUntil: null,
    },
    appearance: {
        theme: "dark",
        density: "normal",
    },
    partnerShare: {
        enabled: false,
    },
};

function mergeSettings(doc) {
    const base = JSON.parse(JSON.stringify(DEFAULTS));
    if (!doc || typeof doc !== "object") return base;
    for (const k of Object.keys(DEFAULTS)) {
        if (doc[k] && typeof doc[k] === "object") {
            base[k] = { ...base[k], ...doc[k] };
        }
    }
    return base;
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const doc = await UserSettings.findOne({ userId }).lean();
        return NextResponse.json(mergeSettings(doc));
    } catch (err) {
        console.error("GET /api/settings:", err);
        return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json().catch(() => ({}));
        const $set = {};

        const pick = (prefix, allowed) => {
            if (!body[prefix] || typeof body[prefix] !== "object") return;
            for (const key of allowed) {
                if (body[prefix][key] !== undefined) {
                    $set[`${prefix}.${key}`] = body[prefix][key];
                }
            }
        };

        pick("goals", ["dailyHours", "enableGoalTracking", "enableStreaks", "enableDeepWorkTracking"]);
        pick("aiSettings", ["enabled", "predictive", "suggestions", "cognitiveLoad", "frequency"]);
        pick("notifications", ["browser", "distractionAlerts", "goalReminders", "weeklyReports"]);
        pick("privacy", ["trackingEnabled", "pauseTrackingUntil"]);
        pick("appearance", ["theme", "density"]);

        if (body.partnerShare && typeof body.partnerShare === "object") {
            if (typeof body.partnerShare.enabled === "boolean") {
                $set["partnerShare.enabled"] = body.partnerShare.enabled;
                if (body.partnerShare.enabled) {
                    const cur = await UserSettings.findOne({ userId }).select("partnerShare.token").lean();
                    if (!cur?.partnerShare?.token) {
                        $set["partnerShare.token"] = newPartnerShareToken();
                    }
                } else {
                    if (!$set) {} // just a placeholder
                }
            }
        }

        if (Object.keys($set).length === 0) {
            return NextResponse.json({ error: "No valid fields" }, { status: 400 });
        }

        const update = { $set };
        if (body.partnerShare && body.partnerShare.enabled === false) {
            update.$unset = { "partnerShare.token": "" };
        }

        const doc = await UserSettings.findOneAndUpdate(
            { userId },
            update,
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        if (body.appearance?.theme) {
            await Preference.findOneAndUpdate(
                { userId },
                { $set: { theme: body.appearance.theme } },
                { upsert: true }
            );
        }

        return NextResponse.json(mergeSettings(doc));
    } catch (err) {
        console.error("PATCH /api/settings:", err);
        return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
    }
}
