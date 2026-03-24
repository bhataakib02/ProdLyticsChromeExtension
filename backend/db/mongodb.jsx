import mongoose from 'mongoose';


let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    const MONGODB_URI = process.env.MONGO_URI;

    if (!MONGODB_URI) {
        console.error("❌ MONGO_URI is missing from process.env!");
        throw new Error('Please define the MONGO_URI environment variable inside .env');
    }
    if (cached.conn) {
        console.log("✅ Using cached MongoDB connection");
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        console.log("📡 Connecting to MongoDB:", MONGODB_URI);
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("🟢 New MongoDB connection established");
            return mongoose;
        }).catch(err => {
            console.error("🔴 MongoDB connection error:", err);
            cached.promise = null;
            throw err;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;
