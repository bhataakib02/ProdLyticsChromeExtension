import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import Payment from "../../../../../../backend/models/Payment.js";
import { getStripe } from "@/lib/stripe";

function getCustomerId(obj) {
    const candidate = obj?.customer;
    return typeof candidate === "string" ? candidate : candidate?.id || null;
}

export async function POST(req) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });

    try {
        const stripe = getStripe();
        const signature = req.headers.get("stripe-signature");
        const payload = await req.text();
        const event = stripe.webhooks.constructEvent(payload, signature, secret);

        await dbConnect();

        switch (event.type) {
            case "checkout.session.completed":
            case "invoice.payment_succeeded": {
                const data = event.data.object;
                const customerId = getCustomerId(data);
                const sessionId = data?.id && String(event.type).includes("checkout") ? data.id : null;
                const amount = Number(data?.amount_total ?? data?.amount_paid ?? data?.amount_due ?? 0);
                const currency = String(data?.currency || "inr");
                if (customerId) {
                    const user = await User.findOneAndUpdate(
                        { stripeCustomerId: customerId },
                        {
                            $set: {
                                subscription: "pro",
                                isPremium: true,
                            },
                        }
                    );
                    if (user) {
                        const subscriptionId =
                            typeof data?.subscription === "string"
                                ? data.subscription
                                : data?.subscription?.id || null;
                        const paymentQuery = { stripeCustomerId: customerId };
                        if (sessionId) paymentQuery.stripeSessionId = sessionId;
                        else if (subscriptionId) paymentQuery.stripeSubscriptionId = subscriptionId;
                        await Payment.findOneAndUpdate(
                            paymentQuery,
                            {
                                $set: {
                                    userId: user._id,
                                    email: user.email || "",
                                    stripeCustomerId: customerId,
                                    stripeSessionId: sessionId,
                                    stripeSubscriptionId: subscriptionId,
                                    stripePaymentIntentId:
                                        typeof data?.payment_intent === "string"
                                            ? data.payment_intent
                                            : data?.payment_intent?.id || null,
                                    amount,
                                    currency,
                                    status: "paid",
                                    type: "subscription",
                                    source: "stripe",
                                    eventCreatedAt: new Date((data?.created || Date.now() / 1000) * 1000),
                                },
                            },
                            { upsert: true, new: true }
                        );
                    }
                }
                break;
            }
            case "customer.subscription.deleted":
            case "invoice.payment_failed": {
                const data = event.data.object;
                const customerId = getCustomerId(data);
                if (customerId) {
                    await User.updateOne(
                        { stripeCustomerId: customerId },
                        {
                            $set: {
                                subscription: "free",
                                isPremium: false,
                            },
                        }
                    );
                    await Payment.findOneAndUpdate(
                        {
                            $or: [
                                ...(data?.id ? [{ stripeSessionId: data.id }] : []),
                                ...(data?.subscription
                                    ? [
                                          {
                                              stripeSubscriptionId:
                                                  typeof data.subscription === "string"
                                                      ? data.subscription
                                                      : data.subscription?.id || null,
                                          },
                                      ]
                                    : []),
                                { stripeCustomerId: customerId },
                            ],
                        },
                        {
                            $set: {
                                stripeCustomerId: customerId,
                                status: event.type === "invoice.payment_failed" ? "failed" : "canceled",
                                source: "stripe",
                                eventCreatedAt: new Date((data?.created || Date.now() / 1000) * 1000),
                            },
                        },
                        { upsert: true, new: true }
                    );
                }
                break;
            }
            default:
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Webhook failed." }, { status: 400 });
    }
}
