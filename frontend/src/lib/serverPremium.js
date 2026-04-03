import User from "../../../backend/models/User.js";

function bypassPremiumCheck() {
    return (
        process.env.AI_COACH_PREMIUM_BYPASS === "true" || process.env.NEXT_PUBLIC_AI_COACH_PREMIUM_BYPASS === "true"
    );
}

/** Returns null if OK, or { status, error } for JSON error response. */
export async function requirePremiumForUserId(userId) {
    if (bypassPremiumCheck()) return null;
    const user = await User.findById(userId).select("subscription isPremium").lean();
    if (!user) return { status: 401, error: "Unauthorized" };
    const pro = user.subscription === "pro" || Boolean(user.isPremium);
    if (!pro) return { status: 403, error: "Premium subscription required." };
    return null;
}
