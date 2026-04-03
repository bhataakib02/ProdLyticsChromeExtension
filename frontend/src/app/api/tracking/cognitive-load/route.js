import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';
import { resolveTrackingMatch } from '@/lib/trackingRangeServer';

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const range = searchParams.get("range") || "today";
        const { match, hourZone } = resolveTrackingMatch(userId, range, searchParams);

        // Bucket by user's local calendar hour (timezone-aware).
        const data = await Tracking.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        bucket: {
                            $dateTrunc: {
                                date: "$date",
                                unit: "hour",
                                timezone: hourZone,
                            },
                        },
                    },
                    avgScrolls: { $avg: "$scrolls" },
                    avgClicks: { $avg: "$clicks" },
                    totalTime: { $sum: "$time" },
                },
            },
            { $sort: { "_id.bucket": 1 } },
        ]);

        const history = data.map((item) => {
            const date = item?._id?.bucket ? new Date(item._id.bucket) : null;
            if (!date || Number.isNaN(date.getTime())) return null;

            const avgS = Number(item.avgScrolls) || 0;
            const avgC = Number(item.avgClicks) || 0;
            const tt = Number(item.totalTime) || 0;

            // Heuristic for cognitive load (0–10 for the chart scale)
            let load = avgS * 0.02 + avgC * 0.05 + tt / 3000;
            if (!Number.isFinite(load)) load = 1;
            load = Math.min(Math.max(Math.round(load * 10) / 10, 0.5), 10);

            return {
                time: date.toISOString(),
                loadScore: load,
            };
        }).filter(Boolean);

        // Ensure we have at least a few points if data is sparse
        if (history.length === 1) {
            const prev = new Date(new Date(history[0].time).getTime() - 3600000).toISOString();
            history.unshift({ time: prev, loadScore: 2 });
        }

        // Calculate metrics for requested range (today in user's timezone by default)
        const totalSessions = data.length;
        const totalTime = data.reduce((acc, curr) => acc + (Number(curr.totalTime) || 0), 0);
        const avgScrolls =
            data.reduce((acc, curr) => acc + (Number(curr.avgScrolls) || 0), 0) / (totalSessions || 1);
        const avgClicks =
            data.reduce((acc, curr) => acc + (Number(curr.avgClicks) || 0), 0) / (totalSessions || 1);

        // Neural Intensity: average engagement per session (0-100)
        const intensity = Math.min(Math.round((avgScrolls * 2) + (avgClicks * 5)), 100);

        // Task Resilience: average session length vs site variety (0-100)
        const avgSessionSecs = totalTime / (totalSessions || 1);
        const resilience = Math.min(Math.round((avgSessionSecs / 1200) * 100), 100);

        // Cognitive Drag
        const drag = Math.max(0, Math.min(100, Math.round(100 - resilience * 0.8)));

        // Deep Work Ratio: needs categorization. 
        const summary = await Tracking.aggregate([
            { $match: match },
            { $group: { _id: "$category", total: { $sum: "$time" } } }
        ]);

        let productive = 0, total = 0;
        summary.forEach(s => {
            total += s.total;
            if (s._id === "productive") productive = s.total;
        });
        // One decimal so small productive shares (e.g. 0.5%) are visible
        const ratio = total > 0 ? Math.round((productive / total) * 1000) / 10 : 0;
        const deepWorkHours = Math.round((productive / 3600) * 10) / 10;

        return NextResponse.json({
            history,
            metrics: {
                intensity: Number.isFinite(intensity) ? intensity : 0,
                resilience: Number.isFinite(resilience) ? resilience : 0,
                drag: Number.isFinite(drag) ? drag : 0,
                ratio: Number.isFinite(ratio) ? ratio : 0,
                deepWorkHours: Number.isFinite(deepWorkHours) ? deepWorkHours : 0,
            },
        });
    } catch (err) {
        console.error("❌ Cognitive Load API Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({
                history: [],
                metrics: {
                    intensity: 0,
                    resilience: 0,
                    drag: 0,
                    ratio: 0,
                    deepWorkHours: 0,
                },
            });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
