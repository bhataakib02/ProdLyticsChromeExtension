import dbConnect from '../../../../backend/db/mongodb.js';
import Goal from '../../../../backend/models/Goal.js';
import Tracking from '../../../../backend/models/Tracking.js';
import Notification from '../../../../backend/models/Notification.js';

/**
 * Checks for incomplete goals created more than 2 hours ago and sends a reminder notification.
 * @param {string} userId - The user ID to check goals for.
 */
export async function checkAndSendGoalReminders(userId) {
    try {
        await dbConnect();
        
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        
        // Find active goals created at least 2 hours ago that haven't been completed yet today.
        // We only care about daily goals for this reminder.
        const activeGoals = await Goal.find({
            userId,
            isActive: true,
            createdAt: { $lte: twoHoursAgo }
        });

        if (activeGoals.length === 0) return;

        // Get tracking data for today to calculate progress
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        for (const goal of activeGoals) {
            // Check if we already sent a reminder for this goal today
            const existingReminder = await Notification.findOne({
                userId,
                title: `Goal Reminder: ${goal.label || goal.type}`,
                createdAt: { $gte: startOfToday }
            });

            if (existingReminder) continue;

            // Calculate current progress
            let currentSeconds = 0;
            const hasTargetSite = goal.website && goal.website.trim() !== "" && goal.website.trim() !== "*";
            
            const matchCondition = {
                userId,
                date: { $gte: startOfToday },
                ...(hasTargetSite
                    ? { website: new RegExp(goal.website.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i") }
                    : { category: "productive" })
            };

            const stats = await Tracking.aggregate([
                { $match: matchCondition },
                { $group: { _id: null, total: { $sum: "$time" } } }
            ]);
            
            currentSeconds = stats[0]?.total || 0;

            // If progress is less than target, send reminder
            if (currentSeconds < goal.targetSeconds) {
                const hoursLeft = Math.max(0, (goal.targetSeconds - currentSeconds) / 3600).toFixed(1);
                
                await Notification.create({
                    userId,
                    title: `Goal Reminder: ${goal.label || goal.type}`,
                    description: `You still have ${hoursLeft} hours left to reach your goal for ${goal.website || 'productive work'}. Keep going!`,
                    type: 'warning'
                });
                
                console.log(`Sent goal reminder to user ${userId} for goal ${goal._id}`);
            }
        }
    } catch (err) {
        console.error("Error in checkAndSendGoalReminders:", err);
    }
}
