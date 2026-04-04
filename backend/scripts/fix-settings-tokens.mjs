import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI not found in .env");
    process.exit(1);
}

async function migrate() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected.");

        const db = mongoose.connection.db;
        const collection = db.collection('usersettings');

        console.log("Step 1: Unsetting partnerShare.token where it is null...");
        const result = await collection.updateMany(
            { "partnerShare.token": null },
            { $unset: { "partnerShare.token": "" } }
        );
        console.log(`Updated ${result.modifiedCount} documents.`);

        console.log("Step 2: Checking existing indexes...");
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes.map(i => i.name));

        const indexName = "partnerShare.token_1";
        if (indexes.some(i => i.name === indexName)) {
            console.log(`Step 3: Dropping index ${indexName}...`);
            await collection.dropIndex(indexName);
            console.log("Index dropped.");
        } else {
            console.log(`Index ${indexName} not found, skipping drop.`);
        }

        console.log("Step 4: Migration complete. Mongoose will recreate the new partial index on next server start.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
