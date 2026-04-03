import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        email: { type: String, default: "" },
        stripeCustomerId: { type: String, default: null, index: true },
        stripeSessionId: { type: String, default: null, index: true },
        stripeSubscriptionId: { type: String, default: null, index: true },
        stripePaymentIntentId: { type: String, default: null, index: true },
        amount: { type: Number, default: 0 }, // in smallest unit, e.g. paise
        currency: { type: String, default: "inr" },
        status: { type: String, default: "pending", index: true }, // pending | paid | failed | canceled
        type: { type: String, default: "subscription" }, // subscription | one_time
        source: { type: String, default: "stripe" },
        eventCreatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
