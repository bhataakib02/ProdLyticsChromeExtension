import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import Payment from "../../../../../../backend/models/Payment.js";
import { resolveAuthenticatedUser } from "@/lib/serverUser";
import { getStripe } from "@/lib/stripe";

export async function POST(req) {
    try {
        await dbConnect();
        const user = await resolveAuthenticatedUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const sessionId = String(body?.sessionId || "").trim();
        if (!sessionId) {
            return NextResponse.json({ error: "Missing sessionId." }, { status: 400 });
        }

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const sessionCustomerId =
            typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const metaUserId = String(session.metadata?.userId || "");
        const customerMatches =
            sessionCustomerId &&
            user.stripeCustomerId &&
            String(sessionCustomerId) === String(user.stripeCustomerId);
        const metaMatches = metaUserId && metaUserId === String(user._id);
        if (!customerMatches && !metaMatches) {
            return NextResponse.json({ error: "Session does not belong to user." }, { status: 403 });
        }

        const paid =
            session.payment_status === "paid" ||
            session.payment_status === "no_payment_required" ||
            session.status === "complete";
        if (paid) {
            const userSet = {
                subscription: "pro",
                isPremium: true,
            };
            if (sessionCustomerId && !user.stripeCustomerId) {
                userSet.stripeCustomerId = sessionCustomerId;
            }
            await User.updateOne({ _id: user._id }, { $set: userSet });
            await Payment.findOneAndUpdate(
                { stripeSessionId: session.id },
                {
                    $set: {
                        userId: user._id,
                        email: user.email || "",
                        stripeCustomerId: user.stripeCustomerId || sessionCustomerId || null,
                        stripeSessionId: session.id,
                        stripeSubscriptionId:
                            typeof session.subscription === "string"
                                ? session.subscription
                                : session.subscription?.id || null,
                        stripePaymentIntentId:
                            typeof session.payment_intent === "string"
                                ? session.payment_intent
                                : session.payment_intent?.id || null,
                        amount: Number(session.amount_total || 0),
                        currency: String(session.currency || "inr"),
                        status: "paid",
                        type: "subscription",
                        source: "stripe",
                        eventCreatedAt: new Date(),
                    },
                },
                { upsert: true, new: true }
            );
            return NextResponse.json({ ok: true, subscription: "pro" });
        }

        return NextResponse.json({
            ok: false,
            subscription: user.subscription || "free",
            reason: "checkout_not_complete",
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Unable to verify checkout." }, { status: 500 });
    }
}
