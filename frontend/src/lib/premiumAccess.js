/**
 * Client-safe: ProdLytics Pro / Premium entitlement.
 * Prefer `subscription === "pro"` (matches `/api/auth/me`); `isPremium` is legacy compatibility.
 */
export function isProdlyticsPremiumUser(user) {
    if (!user) return false;
    return user.subscription === "pro" || Boolean(user.isPremium);
}

/**
 * AI Coach and related premium-only surfaces. Optional bypass for local QA only.
 */
export function canAccessAiCoachClient(user) {
    if (isProdlyticsPremiumUser(user)) return true;
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_AI_COACH_PREMIUM_BYPASS === "true") return true;
    return false;
}
