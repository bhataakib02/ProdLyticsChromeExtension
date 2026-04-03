import { getUserIdFromRequest } from "@/lib/apiUser";
import User from "../../../backend/models/User.js";

/** Resolves the user from `Authorization: Bearer <JWT>` (same token as dashboard / extension). */
export async function resolveAuthenticatedUser(req) {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return null;
    return User.findById(userId);
}
