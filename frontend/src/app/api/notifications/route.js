import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import Notification from '../../../../../backend/models/Notification.js';
import { getUserIdFromRequest } from '@/lib/apiUser';

export async function GET(req) {
    try {
        await dbConnect();
        const userObjectId = await getUserIdFromRequest(req);
        if (!userObjectId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notifications = await Notification.find({ userId: userObjectId })
            .sort({ createdAt: -1 })
            .limit(20);

        return NextResponse.json(notifications);
    } catch (err) {
        if (isDbUnavailableError(err)) return NextResponse.json([]);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const userObjectId = await getUserIdFromRequest(req);
        if (!userObjectId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();

        const notification = new Notification({
            userId: userObjectId,
            title: body.title,
            description: body.description,
            type: body.type || 'info',
        });

        await notification.save();
        return NextResponse.json(notification, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await dbConnect();
        const userObjectId = await getUserIdFromRequest(req);
        if (!userObjectId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Mark all unread notifications as read for this user
        await Notification.updateMany(
            { userId: userObjectId, isRead: false },
            { $set: { isRead: true } }
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
