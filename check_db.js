import mongoose from 'mongoose';
import Tracking from './backend/models/Tracking.js';

async function checkDomains() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/test');
        const data = await Tracking.aggregate([
            { $group: { _id: '$website', totalTime: { $sum: '$time' } } }
        ]);
        console.log("Domains in DB:");
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkDomains();
