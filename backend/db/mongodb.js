import mongoose from 'mongoose';


let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null, unavailableUntil: 0 };
}

const isNetworkDbError = (err) => {
    const msg = String(err?.message || "");
    return (
        err?.code === "ECONNREFUSED" ||
        err?.code === "ENOTFOUND" ||
        err?.code === "ETIMEDOUT" ||
        msg.includes("querySrv ECONNREFUSED")
    );
};

export const isDbUnavailableError = (err) =>
    err?.code === "DB_UNAVAILABLE" || isNetworkDbError(err);

/** Log-safe URI (never print credentials). */
function redactMongoUri(uri) {
    if (!uri || typeof uri !== "string") return "[missing]";
    return uri.replace(/\/\/([^@/]+)@/, "//***@");
}

async function dbConnect() {
    const MONGODB_URI = process.env.MONGO_URI;

    if (!MONGODB_URI) {
        console.error("❌ MONGO_URI is missing from process.env!");
        throw new Error('Please define the MONGO_URI environment variable inside .env');
    }
    const state = mongoose.connection.readyState;

    if (cached.conn && state === 1) {
        console.log("✅ Using active cached MongoDB connection");
        return cached.conn;
    }

    // If the driver disconnected after an earlier successful connect,
    // clear stale cache entries so the next request performs a real reconnect.
    if (state === 0 || state === 3) {
        cached.conn = null;
        cached.promise = null;
    }

    // If a connection attempt is already in progress, wait for it.
    if (state === 2 && cached.promise) {
        cached.conn = await cached.promise;
        return cached.conn;
    }

    if (cached.unavailableUntil && Date.now() < cached.unavailableUntil) {
        const err = new Error("Database temporarily unavailable");
        err.code = "DB_UNAVAILABLE";
        throw err;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            // Increased timeouts to prevent fake failures under heavy Next.js dev server CPU load
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 20000,
        };

        console.log("📡 Connecting to MongoDB:", redactMongoUri(MONGODB_URI));
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log("🟢 New MongoDB connection established");
            cached.unavailableUntil = 0;
            return mongoose;
        }).catch(err => {
            console.error("🔴 MongoDB connection error:", err);
            cached.conn = null;
            cached.promise = null;
            // Avoid retry storms on every request when DB is down.
            if (isNetworkDbError(err)) cached.unavailableUntil = Date.now() + 30000;
            throw err;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

export default dbConnect;