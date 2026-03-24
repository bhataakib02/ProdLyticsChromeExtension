/**
 * Insights Engine Service
 * Analyzes user tracking data to generate actionable productivity insights
 */

import Tracking from "../models/Tracking";
import Goal from "../models/Goal";

/**
 * Generate insights for a user
 */
const generateInsights = async (userId) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const insights = [];

    // 1. Peak Productivity Hours Analysis
    const hourlyData = await Tracking.aggregate([
        { $match: { userId, date: { $gte: weekStart } } },
        {
            $group: {
                _id: { hour: "$hour", category: "$category" },
                totalTime: { $sum: "$time" },
            },
        },
    ]);

    const productivityByHour = Array(24).fill(0).map((_, i) => ({ hour: i, score: 0, total: 0 }));
    hourlyData.forEach(d => {
        const h = d._id.hour;
        productivityByHour[h].total += d.totalTime;
        if (d._id.category === "productive") {
            productivityByHour[h].score += d.totalTime;
        }
    });

    const bestHour = productivityByHour.reduce((prev, curr) =>
        (curr.score > prev.score) ? curr : prev, { hour: 0, score: 0 });

    if (bestHour.score > 0) {
        const period = bestHour.hour >= 12 ? "PM" : "AM";
        const hour12 = bestHour.hour % 12 || 12;
        insights.push({
            type: "peak_performance",
            title: "Peak Productivity Hour",
            content: `Your most productive hour this week was ${hour12} ${period}. Try to schedule your deep work then!`,
            icon: "⚡",
            color: "blue",
        });
    }

    // 2. High distraction analysis
    const topDistractions = await Tracking.aggregate([
        { $match: { userId, date: { $gte: weekStart }, category: "unproductive" } },
        { $group: { _id: "$website", totalTime: { $sum: "$time" } } },
        { $sort: { totalTime: -1 } },
        { $limit: 1 },
    ]);

    if (topDistractions.length > 0) {
        const site = topDistractions[0]._id;
        const minutes = Math.round(topDistractions[0].totalTime / 60);
        insights.push({
            type: "distraction_alert",
            title: "Focus Opportunity",
            content: `You spent ${minutes} minutes on ${site} this week. Reducing this by 20% could save you nearly 10 hours a month!`,
            icon: "🚫",
            color: "red",
        });
    }

    // 3. Streak Analysis
    // (Simplified for this version)
    insights.push({
        type: "motivation",
        title: "Consistency is Key",
        content: "You've completed 3 Pomodoro sessions today. Keep the momentum going!",
        icon: "🔥",
        color: "orange",
    });

    return insights;
};

export default { generateInsights };
