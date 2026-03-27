import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../backend/db/mongodb.js';

const READY_STATE_LABELS = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
};

export async function GET() {
    const beforeState = mongoose.connection.readyState;
    const uriConfigured = Boolean(process.env.MONGO_URI);
    const now = new Date().toISOString();

    try {
        await dbConnect();
        const afterState = mongoose.connection.readyState;

        return NextResponse.json({
            ok: afterState === 1,
            service: 'mongodb',
            time: now,
            uriConfigured,
            state: {
                code: afterState,
                label: READY_STATE_LABELS[afterState] || 'unknown',
                beforeConnectCall: {
                    code: beforeState,
                    label: READY_STATE_LABELS[beforeState] || 'unknown',
                },
            },
        });
    } catch (err) {
        const currentState = mongoose.connection.readyState;
        return NextResponse.json({
            ok: false,
            service: 'mongodb',
            time: now,
            uriConfigured,
            state: {
                code: currentState,
                label: READY_STATE_LABELS[currentState] || 'unknown',
                beforeConnectCall: {
                    code: beforeState,
                    label: READY_STATE_LABELS[beforeState] || 'unknown',
                },
            },
            error: {
                message: err?.message || 'Unknown database error',
                code: err?.code || null,
            },
        }, { status: 503 });
    }
}