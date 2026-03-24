import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../backend/db/mongodb.jsx';

export async function GET() {
    try {
        await dbConnect();
        const status = {
            connected: mongoose.connection.readyState === 1,
            dbName: mongoose.connection.name,
            collections: await mongoose.connection.db.listCollections().toArray().then(cols => cols.map(c => c.name))
        };

        // Try to count some models if they exist
        const counts = {};
        for (const modelName of ['Tracking', 'Goal', 'FocusBlock', 'DeepWorkSession', 'User']) {
            try {
                const model = mongoose.models[modelName] || null;
                if (model) {
                    counts[modelName] = await model.countDocuments();
                } else {
                    counts[modelName] = "Model not loaded";
                }
            } catch (e) {
                counts[modelName] = `Error: ${e.message}`;
            }
        }

        return NextResponse.json({ status, counts });
    } catch (err) {
        return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
}
