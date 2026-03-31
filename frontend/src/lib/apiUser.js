import mongoose from "mongoose";
import { verifyUserJwt } from "./jwt";

/** Resolve Mongo user id from Authorization: Bearer <JWT>. */
export async function getUserIdFromRequest(req) {
    const hdr = req.headers?.get?.("authorization");
    if (!hdr?.startsWith("Bearer ")) return null;
    const token = hdr.slice(7).trim();
    if (!token) return null;
    const payload = await verifyUserJwt(token);
    if (!payload?.sub) return null;
    try {
        return new mongoose.Types.ObjectId(String(payload.sub));
    } catch {
        return null;
    }
}
