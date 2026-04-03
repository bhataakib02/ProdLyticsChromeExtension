import dbConnect from "../../../backend/db/mongodb.js";
import { resolveAuthenticatedUser } from "@/lib/serverUser";

export async function requireAdminUser(req) {
    await dbConnect();
    const user = await resolveAuthenticatedUser(req);
    if (!user) return { error: "Unauthorized", status: 401, user: null };
    if (String(user.role || "user") !== "admin") return { error: "Forbidden", status: 403, user: null };
    return { error: null, status: 200, user };
}
