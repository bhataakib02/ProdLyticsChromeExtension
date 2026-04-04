import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const MONGO_URI = "mongodb://bhataakib022:Prodlytics@ac-lvhxsoj-shard-00-00.p7cg8sv.mongodb.net:27017,ac-lvhxsoj-shard-00-01.p7cg8sv.mongodb.net:27017,ac-lvhxsoj-shard-00-02.p7cg8sv.mongodb.net:27017/prodlytics?ssl=true&replicaSet=atlas-dfzv5t-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Prodlytics";

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const userSchema = new mongoose.Schema({
            name: String,
            isAnonymous: Boolean
        }, { strict: false });

        const User = mongoose.models.User || mongoose.model('User', userSchema);

        const anonymousUsers = await User.find({ 
            isAnonymous: true, 
            $or: [
                { name: "ProdLytics user" },
                { name: { $exists: false } },
                { name: "" }
            ]
        });
        
        console.log(`Found ${anonymousUsers.length} anonymous users to update`);

        for (const user of anonymousUsers) {
            const anonymousId = randomUUID().slice(0, 4).toUpperCase();
            user.name = `ProdLytics User #${anonymousId}`;
            await user.save();
            console.log(`Updated user ${user._id} to ${user.name}`);
        }

        console.log("Migration complete");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
