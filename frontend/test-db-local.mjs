import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function testConnection() {
    console.log("Testing connection to:", MONGO_URI.replace(/\/\/([^@/]+)@/, "//***@"));
    try {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log("✅ Successfully connected to MongoDB Atlas!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Connection failed:");
        console.error(err.message);
        if (err.message.includes("is not whitelisted") || err.message.includes("querySrv ECONNREFUSED")) {
            console.error("\n💡 Possible cause: Your local IP address is not whitelisted in MongoDB Atlas.");
        }
        process.exit(1);
    }
}

testConnection();
