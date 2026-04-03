import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import UserSettings from "../../../../../../backend/models/UserSettings.js";
import Preference from "../../../../../../backend/models/Preference.js";
import Tracking from "../../../../../../backend/models/Tracking.js";
import Goal from "../../../../../../backend/models/Goal.js";
import DeepWorkSession from "../../../../../../backend/models/DeepWorkSession.js";
import FocusBlock from "../../../../../../backend/models/FocusBlock.js";
import Category from "../../../../../../backend/models/Category.js";
import Notification from "../../../../../../backend/models/Notification.js";
import Payment from "../../../../../../backend/models/Payment.js";
import { getUserIdFromRequest } from "@/lib/apiUser";

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const confirm = String(body.confirm || "").trim();

        const user = await User.findById(userId).select("+password email isAnonymous");
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.isAnonymous) {
            return NextResponse.json({ error: "Not available for anonymous users." }, { status: 403 });
        }

        if (user.password) {
            if (!confirm) {
                return NextResponse.json({ error: "Password required to confirm deletion." }, { status: 400 });
            }
            const ok = await bcrypt.compare(confirm, user.password);
            if (!ok) {
                return NextResponse.json({ error: "Password incorrect." }, { status: 401 });
            }
        }

        const uid = new mongoose.Types.ObjectId(String(userId));

        await Promise.all([
            Tracking.deleteMany({ userId: uid }),
            Goal.deleteMany({ userId: uid }),
            DeepWorkSession.deleteMany({ userId: uid }),
            FocusBlock.deleteMany({ userId: uid }),
            Category.deleteMany({ userId: uid }),
            Notification.deleteMany({ userId: uid }),
            Preference.deleteMany({ userId: uid }),
            UserSettings.deleteMany({ userId: uid }),
            Payment.deleteMany({ userId: uid }),
        ]);

        await User.deleteOne({ _id: uid });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("POST /api/auth/delete-account:", err);
        return NextResponse.json({ error: err.message || "Deletion failed" }, { status: 500 });
    }
}
