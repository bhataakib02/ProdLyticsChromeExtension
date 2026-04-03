import Stripe from "stripe";

let stripeClient = null;

export function getStripe() {
    if (stripeClient) return stripeClient;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error("Missing STRIPE_SECRET_KEY.");
    }
    stripeClient = new Stripe(key);
    return stripeClient;
}
