import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function audit() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to Atlas...");
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Available Collections:", collections.map(c => c.name));

        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`- ${col.name}: ${count} docs`);
            if (col.name.includes('config')) {
                const pk = await db.collection(col.name).find({}).toArray();
                console.log(`  Preview of ${col.name}:`, JSON.stringify(pk.slice(0, 2), null, 2));
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

audit();
