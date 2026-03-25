import { MongoClient } from 'mongodb';

async function checkDomains() {
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    try {
        await client.connect();
        const db = client.db('test');
        const trackings = db.collection('trackings');
        
        const data = await trackings.aggregate([
            { $group: { _id: '$website', totalTime: { $sum: '$time' } } },
            { $sort: { totalTime: -1 } }
        ]).toArray();
        
        console.log("Domains in DB:", JSON.stringify(data, null, 2));
    } finally {
        await client.close();
    }
}
checkDomains();
