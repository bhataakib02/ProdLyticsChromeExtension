/** Dynamic copy for AI Insights “coach” panels — driven by real dashboard metrics. */

function fmtHours(sec) {
    const s = Number(sec) || 0;
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min`;
    const h = m / 60;
    return `${h.toFixed(1)}h`;
}

function formatHourShort(hour24) {
    const h = Number(hour24);
    if (!Number.isFinite(h) || h < 0 || h > 23) return null;
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2000, 0, 1, h, 0, 0));
}

/** Best productive hour & heaviest distraction hour from hourly breakdown (minutes per hour). */
function hourlyPeaks(hourlyMetrics) {
    if (!Array.isArray(hourlyMetrics) || hourlyMetrics.length === 0) {
        return { bestProdHour: null, peakDistHour: null, bestProdLabel: null, peakDistLabel: null };
    }
    let bestP = null;
    let bestPM = -1;
    let bestU = null;
    let bestUM = -1;
    for (const row of hourlyMetrics) {
        const hour = Number(row?.hour);
        if (!Number.isFinite(hour)) continue;
        const p = Number(row?.productive) || 0;
        const u = Number(row?.unproductive) || 0;
        if (p > bestPM) {
            bestPM = p;
            bestP = hour;
        }
        if (u > bestUM) {
            bestUM = u;
            bestU = hour;
        }
    }
    return {
        bestProdHour: bestPM > 0 ? bestP : null,
        peakDistHour: bestUM > 0 ? bestU : null,
        bestProdLabel: bestPM > 0 ? formatHourShort(bestP) : null,
        peakDistLabel: bestUM > 0 ? formatHourShort(bestU) : null,
    };
}

export function coachProductivityScore({ metrics, yesterdayMetrics, scoreDeltaVsYesterday, firstName, aiReport }) {
    const score = Number(metrics?.score);
    const prod = Number(metrics?.productiveTime) || 0;
    const unprod = Number(metrics?.unproductiveTime) || 0;
    const streak = Number(metrics?.streak) || 0;
    const neutral = Number(metrics?.neutralTime) || 0;
    const total = prod + unprod + neutral;
    const peakWin = aiReport?.peakProdWindow ? String(aiReport.peakProdWindow).trim() : "";
    const prodShare = total > 60 ? Math.round((prod / total) * 100) : null;

    let insight = "";
    if (!Number.isFinite(score) || total < 120) {
        insight = `${firstName}, your focus score needs a bit more tracked time to be reliable. Keep the extension active today—we learn your productive vs distracting minutes from real browsing.`;
    } else if (score >= 75) {
        insight = `Strong day: ${score}% of your weighted time skews productive. That usually means fewer context switches and more time on sites you’ve marked (or we’ve learned) as work-aligned.`;
    } else if (score >= 50) {
        insight = `Mixed focus (${score}%): you’re getting work in, but distracting minutes are still carving out a noticeable share. The score reacts to both how long you stay on-task and how heavy distraction stretches are.`;
    } else {
        insight = `A tougher focus day (${score}%): distracting time is winning more minutes than ideal. The score isn’t judgment—it’s a mirror of where your tracked attention went.`;
    }

    if (prodShare != null && prodShare >= 0) {
        insight += ` About ${prodShare}% of today’s tracked minutes are on productive sites—the rest is distracting or neutral, which is why small shifts in tab habits move the needle.`;
    }
    if (peakWin) {
        insight += ` Your hourly pattern today suggests peak output around ${peakWin}—defend that slice on your calendar when you can.`;
    }

    if (scoreDeltaVsYesterday != null && Number.isFinite(scoreDeltaVsYesterday)) {
        insight += ` Compared to yesterday’s snapshot, you’re ${scoreDeltaVsYesterday >= 0 ? "up" : "down"} ${Math.abs(Math.round(scoreDeltaVsYesterday))} points—small moves add up across the week.`;
    }

    const recs = [
        unprod > prod * 0.4
            ? `Trim repeat visits to your top distracting sites—those minutes compound faster than it feels.`
            : `Protect long stretches on your top productive sites; depth beats tab-hopping.`,
        peakWin
            ? `Tomorrow, put your hardest task first in ${peakWin} before email and chat fragment you.`
            : streak >= 3
              ? `You’re on a ${streak}-day streak—keep the chain with one intentional focus block tomorrow.`
              : `Aim for one “no-scroll” hour on your hardest task before lunch.`,
        streak >= 3
            ? `Streak tip: end today by noting what helped the ${streak}-day run—repeat that cue tomorrow.`
            : `Use Focus mode or the timer when score dips—blocking noise is the fastest lever.`,
        `Sync the extension from the header after deep work so this score stays honest.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}

export function coachBehavioralPatterns({ cognitiveMetrics, insightsData, hourlyMetrics }) {
    const n = Array.isArray(cognitiveMetrics) ? cognitiveMetrics.length : 0;
    const m = insightsData || {};
    const intensity = Number(m.intensity);
    const resilience = Number(m.resilience);
    const peaks = hourlyPeaks(hourlyMetrics);

    let insight = "";
    if (n < 2) {
        insight =
            "We’re still mapping your hourly rhythm—once we have a few hours of synced activity, you’ll see clearer peaks (when focus feels easier) and troughs (when attention fragments).";
    } else {
        insight = `Across recent hours, interaction intensity is around ${Number.isFinite(intensity) ? Math.round(intensity) : "—"}% and session continuity around ${Number.isFinite(resilience) ? Math.round(resilience) : "—"}%. Higher continuity often means longer dwell per visit; higher intensity can mean busier navigation (more switches).`;
    }

    if (peaks.bestProdLabel && peaks.peakDistLabel) {
        insight += ` From today’s hour-by-hour mix, you logged the most productive minutes around ${peaks.bestProdLabel} and the heaviest distraction around ${peaks.peakDistLabel}—that gap is your scheduling leverage.`;
    } else if (peaks.bestProdLabel) {
        insight += ` Your strongest productive hour today clustered around ${peaks.bestProdLabel}—treat that like “prime real estate” on your calendar.`;
    }

    const recs = [
        peaks.bestProdLabel
            ? `Schedule demanding work right before or inside the ${peaks.bestProdLabel} window when possible—protect it as a hard start.`
            : `Schedule demanding work in the hour block where your curve was steadiest today—protect it on calendar.`,
        peaks.peakDistLabel
            ? `Around ${peaks.peakDistLabel}, expect more drift—use a timer, blocklist, or batch shallow tasks so deep work isn’t parked there.`
            : `When continuity drops, try a 5-minute reset (walk, water) before opening another tab spiral.`,
        `Batch similar tasks (email, chat) so intensity spikes don’t fragment deep work.`,
        Number.isFinite(intensity) && intensity > 60
            ? `High intensity often means rapid switching—close finished tabs on purpose so each session has one job.`
            : `If evenings look noisy, move light reading or admin to that window.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}

export function coachDistractionAlerts({ metrics, todaySites, aiReport }) {
    const unprod = Number(metrics?.unproductiveTime) || 0;
    const prod = Number(metrics?.productiveTime) || 0;
    const sites = Array.isArray(todaySites) ? todaySites : [];
    let bad = sites
        .filter((w) => w?.category === "unproductive" && Number(w?.totalTime) > 0)
        .sort((a, b) => Number(b.totalTime) - Number(a.totalTime))
        .slice(0, 3);

    const fromReport = Array.isArray(aiReport?.topDistractions) ? aiReport.topDistractions : [];
    if (bad.length === 0 && fromReport.length > 0) {
        bad = fromReport.slice(0, 3).map((t) => ({
            _id: t.site,
            website: t.site,
            category: "unproductive",
            totalTime: Number(t.wastedSeconds) || 0,
        }));
    }

    const lostMin = Math.round(unprod / 60);
    const topLabel = bad[0]?._id || bad[0]?.website || fromReport[0]?.site || "your top distracting site";
    const topReportSec = Number(fromReport[0]?.wastedSeconds) || Number(bad[0]?.totalTime) || 0;
    const peakDist = aiReport?.peakDistractionWindow ? String(aiReport.peakDistractionWindow) : "";

    const reclaimBit =
        topReportSec >= 120
            ? ` Reclaiming even half of that ${fmtHours(topReportSec)} on your #1 site is a realistic win this week.`
            : "";

    const insight =
        bad.length > 0
            ? `Distraction time is roughly ${fmtHours(unprod)} today (~${lostMin} min)—“${String(topLabel).slice(0, 80)}” is pulling notable minutes.${reclaimBit}`
            : unprod > 120
              ? `Unproductive minutes are roughly ${fmtHours(unprod)} today—once a few sites surface in your leaderboard, we’ll call them out by name.`
              : `Little distraction logged so far—or categories are still neutral. Keep browsing with the extension to sharpen this view.`;

    if (peakDist && bad.length > 0) {
        insight += ` Your pattern shows distraction clustering around ${peakDist}—that’s the window to guard with Focus mode, not willpower.`;
    }

    const recs = [
        bad.length
            ? `Start here: mute or block ${String(topLabel).split(" · ")[0]} for your next deep-work block—${fmtHours(topReportSec)} today is the “tax” you’re paying.`
            : `When distraction creeps in, start a short timer—bounded sessions beat “just five more minutes.”`,
        prod > 0 && unprod > prod * 0.35
            ? `Right now distraction is a sizable slice vs productive time—swap one scroll loop for a single-task block.`
            : `Keep a “distraction budget” (e.g., 15 min) after focused work instead of sprinkling it throughout.`,
        peakDist
            ? `Pre-decide one rule for ${peakDist}: either no social/video tabs or phone face-down—remove the cue, not the craving.`
            : `Use blocklists for repeat offenders during deep work hours.`,
        fromReport.length >= 2
            ? `Rotate attention: if ${String(fromReport[1]?.site || "your #2 site")} is also creeping up, combine those breaks instead of sprinkling them.`
            : `If evenings drift, schedule lighter tasks there instead of fighting your hardest work.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}

export function coachPersonalizedSuggestions({ milestone, metrics, aiReport, focusSessionMinutes }) {
    const score = Number(metrics?.score) || 0;
    const fm = Math.min(120, Math.max(5, Number(focusSessionMinutes) || 25));
    const peakP = aiReport?.peakProdWindow ? String(aiReport.peakProdWindow) : "";
    const peakD = aiReport?.peakDistractionWindow ? String(aiReport.peakDistractionWindow) : "";
    const topD = Array.isArray(aiReport?.topDistractions) ? aiReport.topDistractions[0] : null;
    const topSite = topD?.site ? String(topD.site) : "";

    let why = "";
    if (peakP && topSite) {
        why = `We’re weighting advice toward peak output (${peakP}) and your biggest leak (${topSite}) because those two levers usually change how the day feels the fastest.`;
    } else if (peakP) {
        why = `Your clearest signal today is timing—${peakP} is when tracked productive minutes cluster, so the cards above lean into protecting that slot.`;
    } else if (topSite) {
        why = `${topSite} is dominating distraction minutes; suggestions emphasize friction (blocks, timers) there first—not generic “be disciplined” tips.`;
    } else {
        why = `These tips come from your live score, streak, and depth signals—not one-size-fits-all productivity advice.`;
    }

    const insight = `${why} Milestone: “${milestone?.title || "Keep going"}”. ${milestone?.body || ""}`;

    const recs = [
        score < 60
            ? `Tomorrow, lead with a ${fm}-minute focus block on your hardest task before email.${peakP ? ` Aim to start inside ${peakP}.` : ""}`
            : `Protect today’s momentum—book a follow-up ${fm}-minute block while you still feel “warmed up.”${peakP ? ` Stack it near ${peakP}.` : ""}`,
        topSite && peakD
            ? `Pair rule: no ${topSite} during ${peakD}—replace that slot with one measurable task from your actual backlog.`
            : `Pair one insight with one action: pick a single lever (timer, blocklist, or calendar) and use it twice.`,
        `Write a one-line intention before each session—reduces “accidental” browsing.`,
        `End the day with a 60-second reflection on what worked; it reinforces streaks.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}

export function coachWeeklyReport({ weekStats, weeklyDelta, weekComparison }) {
    const sc = weekStats?.score != null ? `${weekStats.score}%` : "—";
    const ph = weekStats?.productiveTime != null ? (Number(weekStats.productiveTime) / 3600).toFixed(1) : "—";
    const uh = weekStats?.unproductiveTime != null ? (Number(weekStats.unproductiveTime) / 3600).toFixed(1) : "—";

    const prevW = weekComparison?.previous;
    const curW = weekComparison?.current;
    const prevSc = Number(prevW?.scoreSafe ?? prevW?.score);
    const curSc = Number(curW?.scoreSafe ?? curW?.score);

    let insight = `Rolling 7-day focus score: ${sc}. Productive time ~${ph}h vs distracting ~${uh}h—one rough day doesn’t erase the trend, but patterns show where to intervene.`;
    if (weeklyDelta && Number.isFinite(weeklyDelta.delta) && Number.isFinite(prevSc) && Number.isFinite(curSc)) {
        insight += ` Week-over-week focus score moved from ${Math.round(prevSc)}% to ${Math.round(curSc)}% (${weeklyDelta.delta >= 0 ? "+" : "−"}${weeklyDelta.pct}% vs last week’s level)—that’s the number to defend or improve, not single-day noise.`;
    } else if (Number.isFinite(prevSc) && Number.isFinite(curSc)) {
        insight += ` Last week’s score was about ${Math.round(prevSc)}%; this week is ${Math.round(curSc)}%.`;
    }

    const recs = [
        weeklyDelta && weeklyDelta.delta < 0
            ? `This week dipped—pick one concrete guardrail (same blocklist + same morning block every weekday) before chasing a higher goal.`
            : `Pick the weakest weekday (lowest focus or highest distraction) and schedule one protected block there next week.`,
        `Compare weeks by score first, then by hours—score captures quality of time mix, not just duration.`,
        Number(uh) > Number(ph) * 0.6
            ? `Distracting hours are high vs productive this window—trim 30 minutes of scroll/video across the week; that alone often lifts score.`
            : `If distraction hours climb week-over-week, tighten focus rules before adding more goals.`,
        `Export or screenshot this view Friday—quick accountability loop for Monday planning.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}

export function coachPredictiveAnalytics({
    peakMeta,
    tomorrowPlanCopy,
    scoreDeltaVsYesterday,
    metrics,
    predictionSignal,
    predictedScore,
    weekScores,
}) {
    const score = Number(metrics?.score) || 0;
    const sigType = predictionSignal?.type || "neutral";
    const next = Number.isFinite(predictedScore) ? predictedScore : null;
    const cur = Number.isFinite(weekScores?.current) ? weekScores.current : null;

    let insight = peakMeta?.best
        ? `${tomorrowPlanCopy || "We’ll suggest a time once peaks are clear."} `
        : `Predictions improve with more hourly samples. ${score >= 60 ? "Your score today is healthy—keep feeding the extension data so peak windows become sharper." : "Early signals suggest protecting focus blocks—once peaks stabilize, we’ll anchor predictions to them."}`;

    if (peakMeta?.best) {
        insight +=
            scoreDeltaVsYesterday != null && scoreDeltaVsYesterday < 0
                ? `Trend-wise, today’s score dipped vs yesterday—worth a lighter afternoon or a tighter focus block tomorrow.`
                : `You’re holding steady—use tomorrow’s suggested block to compound gains.`;
    }

    if (next != null && cur != null && sigType !== "neutral") {
        insight += ` The simple forecast lands near ${next}% next week (vs ${cur}% this week)—${sigType === "risk" ? "treat that as a nudge to adjust habits early, not a verdict." : "momentum you can reinforce with one protected daily block."}`;
    } else if (next != null && cur != null) {
        insight += ` The model expects next week close to ${next}%, roughly in line with this week—small habit tweaks still move the range.`;
    }

    const recs = [
        sigType === "risk"
            ? `Priority: move one important task to the first half of your day for the next few days—break the slide before it becomes routine.`
            : sigType === "growth"
              ? `You’re trending up—capture it: repeat the same pre-work ritual (clear desk, one tab, timer) so the uplift isn’t accidental.`
              : `If the forecast ever flags a slump, front-load important work before your usual dip.`,
        `Pair predictions with calendar: block the suggested window before the day fills.`,
        `Watch score delta day-to-day—two down days in a row means change the environment, not the goal.`,
        `Revisit Focus Mode rules if predictions keep missing—blocklists are the “environment” lever.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}

/** Milestone encouragement card — shared by AI Insights view and AI Coach copy. */
export function buildInsightsMilestone(metrics, cognitiveMetrics, deepWorkHoursRaw) {
    const streak = Number(metrics?.streak) || 0;
    const score = Number(metrics?.score) || 0;
    const samples = Array.isArray(cognitiveMetrics) ? cognitiveMetrics.length : 0;
    const totalTracked =
        (Number(metrics?.productiveTime) || 0) +
        (Number(metrics?.unproductiveTime) || 0) +
        (Number(metrics?.neutralTime) || 0);
    const deepH = Number(deepWorkHoursRaw);
    const deepOk = Number.isFinite(deepH) ? deepH : 0;

    if (samples < 2 && totalTracked < 180) {
        return {
            title: "Calibrate your insights",
            body: "Browse with the ProdLytics extension for a day—milestones and peak windows will match your real rhythms.",
            barPct: 18,
        };
    }
    if (streak >= 7) {
        return {
            title: "Unstoppable streak",
            body: `${streak} productive days in a row. You're building a serious habit.`,
            barPct: Math.min(100, 42 + Math.min(streak, 14) * 4),
        };
    }
    if (streak >= 3) {
        return {
            title: "Momentum locked in",
            body: `${streak}-day streak—small consistent wins beat occasional heroics.`,
            barPct: Math.min(100, 38 + streak * 8),
        };
    }
    if (score >= 85) {
        return {
            title: "Elite focus day",
            body: "Your productive share is outstanding today. Protect this window from low-value tabs.",
            barPct: Math.min(100, score),
        };
    }
    if (deepOk >= 3) {
        return {
            title: "Deep work in the bank",
            body: `Roughly ${deepOk}h on productive sites in the last 24h—strong depth signal.`,
            barPct: Math.min(100, 35 + deepOk * 12),
        };
    }
    if (streak >= 1) {
        return {
            title: "Keep the chain going",
            body: "You're on the board—come back tomorrow to extend your streak.",
            barPct: Math.min(100, 28 + streak * 12),
        };
    }
    return {
        title: "Keep tracking",
        body: "Every hour of data sharpens peak windows, load curves, and your objectives.",
        barPct: Math.min(100, Math.max(22, score)),
    };
}

export function coachGoalBasedInsights({ goals, aiReport }) {
    const arr = Array.isArray(goals) ? goals.filter((g) => g?.isActive !== false) : [];
    const top = arr[0];
    const pg = aiReport?.primaryGoal;
    const pct = top ? Math.min(100, Math.max(0, Number(top.progress) || 0)) : 0;
    const targetSec = Number(top?.targetSeconds ?? pg?.targetSeconds) || 0;
    const curSec = Number(top?.currentSeconds ?? pg?.currentSeconds) || 0;
    const gapMin = targetSec > curSec ? Math.round((targetSec - curSec) / 60) : 0;
    const met = Boolean(pg?.metToday);
    const gType = top?.type || pg?.type;

    let insight = "";
    if (arr.length === 0) {
        insight =
            "No active goals yet—add one in Goals so we can quantify the gap between today’s tracked time and what you intended.";
    } else {
        insight = `Top goal: ${pct}% on “${top.label || top.website || "your goal"}”. `;
        if (gapMin > 0 && gType === "productive") {
            insight += `You’re about ${gapMin} minutes of tracked productive time shy of today’s target—that’s a single focused block, not an all-day overhaul.`;
        } else if (gType === "unproductive") {
            insight += `This is a limit-style goal—staying under the cap matters as much as hitting a productive number.`;
        } else {
            insight += `Small daily nudges close the gap faster than big sporadic pushes.`;
        }
        if (met) {
            insight += ` You’ve already hit today’s target for this goal—optional stretch: bank a little extra for a lighter tomorrow.`;
        }
    }

    const recs = [
        arr.length
            ? gType === "productive" && gapMin > 0 && !met
              ? `Start here: one timer block solely for “${top.label || top.website || "this goal"}”—ignore everything else until the alarm.`
              : gType === "unproductive" && !met
                ? `When you approach the limit site, open Goals tab first—seeing the meter often stops “just one scroll.”`
                : `If progress < 50% after midday, shorten the next work block to finish one measurable slice of the goal.`
            : `Add one realistic goal (e.g., daily productive hours) before tuning distractions.`,
        arr.length > 1
            ? `You have ${arr.length} active goals—rotate: finish the smallest gap first so motivation compounds.`
            : `Align goals with focus mode—block distracting sites during the hours that count toward the goal.`,
        `If the gap stays wide for a week, lower the target 10%—consistency beats heroic targets.`,
        pct >= 70 && !met
            ? `You’re in the home stretch—remove one recurring notification during the next hour so the final chunk doesn’t slip.`
            : `Celebrate crossing 70%—then set a “stretch” sub-goal for the remainder of the day.`,
    ];

    return { insight, recommendations: recs.slice(0, 4) };
}
