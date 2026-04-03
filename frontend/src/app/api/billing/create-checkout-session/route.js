import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { resolveAuthenticatedUser } from "@/lib/serverUser";
import { getStripe } from "@/lib/stripe";

function appBaseUrl(req) {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const origin = req.headers.get("origin");
    return (origin || "http://localhost:3000").replace(/\/$/, "");
}

export async function POST(req) {
    try {
        await dbConnect();
        const user = await resolveAuthenticatedUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json().catch(() => ({}));
        const nextPathRaw = String(body?.nextPath || "").trim();
        const nextPath =
            nextPathRaw && nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
                ? nextPathRaw
                : "/";
        const nextEncoded = encodeURIComponent(nextPath);

        const stripe = getStripe();

        if (!user.stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: { userId: user._id.toString() },
            });
            user.stripeCustomerId = customer.id;
            await user.save();
        }

        const baseUrl = appBaseUrl(req);
        const priceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
        const lineItem = priceId
            ? { price: priceId, quantity: 1 }
            : {
                  price_data: {
                      currency: "inr",
                      recurring: { interval: "month" },
                      product_data: { name: "ProdLytics Premium (Monthly)" },
                      unit_amount: 19900,
                  },
                  quantity: 1,
              };

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            customer: user.stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [lineItem],
            success_url: `${baseUrl}/upgrade?success=1&session_id={CHECKOUT_SESSION_ID}&next=${nextEncoded}`,
            cancel_url: `${baseUrl}/upgrade?canceled=1&next=${nextEncoded}`,
            metadata: {
                userId: user._id.toString(),
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Unable to start checkout." }, { status: 500 });
    }
}
