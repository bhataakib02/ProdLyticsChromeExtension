import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { getStripe } from "@/lib/stripe";
import { getUserIdFromRequest } from "@/lib/apiUser";

function appBaseUrl() {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
}

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const user = await User.findById(userId).select("stripeCustomerId email isAnonymous").lean();
        if (!user || user.isAnonymous) {
            return NextResponse.json({ error: "Billing portal requires a registered account with Stripe history." }, { status: 403 });
        }
        if (!user.stripeCustomerId) {
            return NextResponse.json({ error: "No subscription billing profile found. Upgrade first or contact support." }, { status: 400 });
        }

        const stripe = getStripe();
        const base = appBaseUrl();
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${base}/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error("POST /api/billing/create-portal-session:", err);
        const msg = err?.message || "Failed to open billing portal";
        if (msg.includes("STRIPE_SECRET_KEY") || msg.includes("Missing")) {
            return NextResponse.json({ error: "Billing is not configured on this server." }, { status: 503 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
