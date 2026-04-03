function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
}

function formatSecondsShort(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
}

function formatHourLabel(hour24) {
    const h = clamp(hour24, 0, 23);
    // Use an anchor date; we only need local hour formatting for the user.
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, h, 0, 0));
}

function formatHourWindow(startHour, endHourInclusive) {
    const s = clamp(startHour, 0, 23);
    const e = clamp(endHourInclusive, 0, 23);
    if (s === e) return formatHourLabel(s);
    return `${formatHourLabel(s)} - ${formatHourLabel(e)}`;
}

function sumHourlyMinutes(hourly) {
    if (!Array.isArray(hourly)) return { total: 0, productive: 0, unproductive: 0, neutral: 0 };
    const total = hourly.reduce((acc, h) => acc + (Number(h?.productive) || 0) + (Number(h?.unproductive) || 0) + (Number(h?.neutral) || 0), 0);
    const productive = hourly.reduce((acc, h) => acc + (Number(h?.productive) || 0), 0);
    const unproductive = hourly.reduce((acc, h) => acc + (Number(h?.unproductive) || 0), 0);
    const neutral = hourly.reduce((acc, h) => acc + (Number(h?.neutral) || 0), 0);
    return { total, productive, unproductive, neutral };
}

function findPeakHours(hourly) {
    if (!Array.isArray(hourly) || hourly.length < 1) return { peakProductiveHour: null, peakUnproductiveHour: null };
    let peakProductiveHour = null;
    let peakProductiveMinutes = 0;
    let peakUnproductiveHour = null;
    let peakUnproductiveMinutes = 0;

    for (const h of hourly) {
        const hour = Number(h?.hour);
        if (!Number.isFinite(hour)) continue;
        const productive = Number(h?.productive) || 0;
        const unproductive = Number(h?.unproductive) || 0;
        if (productive > 0 && productive >= peakProductiveMinutes) {
            peakProductiveMinutes = productive;
            peakProductiveHour = hour;
        }
        if (unproductive > 0 && unproductive >= peakUnproductiveMinutes) {
            peakUnproductiveMinutes = unproductive;
            peakUnproductiveHour = hour;
        }
    }

    // If there was no non-zero activity, treat as "no peak yet"
    if (peakProductiveMinutes === 0) peakProductiveHour = null;
    if (peakUnproductiveMinutes === 0) peakUnproductiveHour = null;

    return { peakProductiveHour, peakUnproductiveHour };
}

function computeConsistencyFactor(hourly) {
    if (!Array.isArray(hourly) || hourly.length < 1) return null;
    let trackedHours = 0;
    let distractedHours = 0;
    for (const h of hourly) {
        const productive = Number(h?.productive) || 0;
        const unproductive = Number(h?.unproductive) || 0;
        const neutral = Number(h?.neutral) || 0;
        const total = productive + unproductive + neutral;
        if (total <= 0) continue;
        trackedHours++;
        if (unproductive > productive) distractedHours++;
    }
    if (trackedHours <= 0) return null;
    return 1 - distractedHours / trackedHours; // 1=consistent, 0=mostly distracted
}

function formatDateTimeLabel(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(d);
}

function formatHoursMinutesFromSeconds(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return `${Math.round(s)}s`;
}

function getPrimaryGoal(goals) {
    if (!Array.isArray(goals)) return null;
    const active = goals.filter((g) => g && g.isActive !== false);
    if (active.length === 0) return null;
    // Prefer productive goals first; otherwise use the first active one.
    const productive = active.filter((g) => g.type === "productive");
    return (productive[0] || active[0]) ?? null;
}

function computeGoalInsight(goal, peakProductiveWindow, focusSessionMinutes) {
    if (!goal) return "No active goals found today. Add one in the Goals tab to get targeted coaching.";

    const label = String(goal.label || goal.website || (goal.type === "productive" ? "Productive goal" : "Limit goal")).trim() || "Goal";
    const targetSeconds = Number(goal.targetSeconds) || 0;
    const currentSeconds = Number(goal.currentSeconds) || 0;
    const focusMin = Number.isFinite(Number(focusSessionMinutes)) ? Math.round(Number(focusSessionMinutes)) : 25;

    if (goal.type === "productive") {
        const completion = targetSeconds > 0 ? Math.round(clamp((currentSeconds / targetSeconds) * 100, 0, 100)) : 0;
        const achievedPretty = formatHoursMinutesFromSeconds(currentSeconds);
        if (completion >= 100 || Boolean(goal.metToday)) {
            return `Goal: ${label}. You hit ${achievedPretty} of productive work (${completion}% complete).`;
        }
        if (peakProductiveWindow) {
            return `Goal: ${label}. You have ${achievedPretty} (${completion}% complete). Next, schedule your next ${focusMin}-minute block inside ${peakProductiveWindow}.`;
        }
        return `Goal: ${label}. You have ${achievedPretty} (${completion}% complete).`;
    }

    if (goal.type === "unproductive") {
        const targetHours = targetSeconds / 3600;
        const usedHours = currentSeconds / 3600;
        const usedPretty = formatSecondsShort(currentSeconds);
        const targetPretty = formatSecondsShort(targetSeconds);
        const met = Boolean(goal.metToday);
        if (met) {
            return `Goal: ${label}. You used ${usedPretty} (max ${targetPretty}) => you're under your limit (nice control).`;
        }
        // "under max" percent: if above max, clamp to 0.
        const underPct = targetSeconds > 0 ? clamp(Math.round(((targetSeconds - currentSeconds) / targetSeconds) * 100), 0, 100) : 0;
        const suggested = peakProductiveWindow ? `Use your next focus block in ${peakProductiveWindow} and avoid this site during distraction peaks.` : "Use a focus block next and avoid this site during distraction peaks.";
        return `Goal: ${label}. You used ${usedPretty} (max ${targetPretty}) => ${underPct}% under your limit. ${suggested}`;
    }

    return `Goal: ${label}.`;
}

function computeTopDistractions(todayWebsites) {
    if (!Array.isArray(todayWebsites)) return [];
    return todayWebsites
        .filter((w) => w && w.category === "unproductive" && Number(w.totalTime) > 0)
        .sort((a, b) => Number(b.totalTime) - Number(a.totalTime))
        .slice(0, 3)
        .map((w) => {
            const rawId = String(w._id || "").trim();
            const site = rawId.includes(" · ") ? rawId.split(" · ")[0].trim() : rawId;
            return { site: site || rawId || "Distraction", wastedSeconds: Number(w.totalTime) || 0 };
        });
}

function computeCognitiveLoadInsight(cognitiveMetrics) {
    if (!Array.isArray(cognitiveMetrics) || cognitiveMetrics.length < 1) {
        return "Cognitive-load insights will appear after we have a bit more browsing history (hourly data).";
    }

    const points = cognitiveMetrics
        .map((p) => ({
            iso: p?.time,
            load: Number(p?.loadScore),
        }))
        .filter((p) => p.iso && Number.isFinite(p.load));

    if (points.length < 1) {
        return "Cognitive-load insights need valid hourly data from the extension.";
    }

    points.sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
    const latest = points[points.length - 1];
    const latestLabel = formatDateTimeLabel(latest.iso);

    let highest = points[0];
    for (const p of points) {
        if (p.load > highest.load) highest = p;
    }

    const highThreshold = 7;
    const fatigueThreshold = 4;

    // Longest consecutive run of "high effort" points.
    let bestRun = { startIdx: null, endIdx: null, len: 0 };
    let runStart = null;
    for (let i = 0; i < points.length; i++) {
        const isHigh = points[i].load >= highThreshold;
        if (isHigh) {
            if (runStart === null) runStart = i;
        } else {
            if (runStart !== null) {
                const len = i - runStart;
                if (len > bestRun.len) bestRun = { startIdx: runStart, endIdx: i - 1, len };
                runStart = null;
            }
        }
    }
    if (runStart !== null) {
        const len = points.length - runStart;
        if (len > bestRun.len) bestRun = { startIdx: runStart, endIdx: points.length - 1, len };
    }

    if (bestRun.len >= 2) {
        const startLabel = formatDateTimeLabel(points[bestRun.startIdx].iso);
        const endLabel = formatDateTimeLabel(points[bestRun.endIdx].iso);

        // Fatigue zone: first "not high" that drops below fatigueThreshold after the high run ends.
        let fatigueLabel = "";
        for (let j = bestRun.endIdx + 1; j < points.length; j++) {
            if (points[j].load <= fatigueThreshold) {
                fatigueLabel = formatDateTimeLabel(points[j].iso);
                break;
            }
        }

        return `Your cognitive load peaked in the ${startLabel} - ${endLabel} window (high effort), and it ${fatigueLabel ? `dropped around ${fatigueLabel}` : "eased later"} — this often signals a fatigue/relief cycle. Latest hour: ${latestLabel}.`;
    }

    const peakLabel = formatDateTimeLabel(highest.iso);
    return `Your cognitive load peaked around ${peakLabel} (highest mental effort). Latest synced hour: ${latestLabel}.`;
}

function computePredictionConfidence({ weekComparison, hourlyMetrics, cognitiveMetrics }) {
    const weeklySignal =
        weekComparison && weekComparison.current && weekComparison.previous && (Number(weekComparison.current?.totalTime) > 0 || Number(weekComparison.previous?.totalTime) > 0);
    const hourlyCount = Array.isArray(hourlyMetrics) ? hourlyMetrics.filter((h) => (Number(h?.productive) || 0) + (Number(h?.unproductive) || 0) + (Number(h?.neutral) || 0) > 0).length : 0;
    const cognitiveCount = Array.isArray(cognitiveMetrics)
        ? cognitiveMetrics.filter((p) => p?.time && Number.isFinite(Number(p?.loadScore))).length
        : 0;

    let points = 0;
    if (weeklySignal) points += 2;
    if (hourlyCount >= 8) points += 1;
    if (hourlyCount >= 16) points += 1;
    if (cognitiveCount >= 4) points += 1;
    if (cognitiveCount >= 10) points += 1;

    if (points >= 5) return "High confidence";
    if (points >= 3) return "Medium confidence";
    return "Low confidence";
}

function computeAiInsightsCoachReport({ hourlyMetrics, todayWebsites, weekComparison, goals, cognitiveMetrics, focusSessionMinutes }) {
    const hourly = Array.isArray(hourlyMetrics) ? hourlyMetrics : [];
    const { total, productive, unproductive } = sumHourlyMinutes(hourly);
    const unproductiveSecondsPrecise = Array.isArray(todayWebsites)
        ? todayWebsites.reduce(
              (acc, w) => acc + (w && w.category === "unproductive" ? Number(w.totalTime) || 0 : 0),
              0
          )
        : 0;

    const consistency = computeConsistencyFactor(hourly);
    const peakHours = findPeakHours(hourly);
    const peakProdWindow = peakHours.peakProductiveHour != null ? formatHourWindow(peakHours.peakProductiveHour, Math.min(23, peakHours.peakProductiveHour + 2)) : null;
    const peakDistractionWindow =
        peakHours.peakUnproductiveHour != null ? formatHourWindow(peakHours.peakUnproductiveHour, Math.min(23, peakHours.peakUnproductiveHour + 1)) : null;

    const productiveShare = total > 0 ? productive / total : 0;
    const distractShare = total > 0 ? unproductive / total : 0;

    let productivityScore = null;
    if (total > 0) {
        const delta = productiveShare - distractShare; // [-1..1]
        const baseNormalized = ((delta + 1) / 2) * 100; // [0..100]
        const consistencySafe = consistency == null ? 0.8 : clamp(consistency, 0, 1);
        const multiplier = 0.75 + 0.25 * consistencySafe; // [0.75..1]
        const raw = baseNormalized * multiplier;
        const precisePenalty = unproductiveSecondsPrecise > 0 ? Math.max(1, Math.round(unproductiveSecondsPrecise / 60)) : 0;
        let next = Math.round(clamp(raw - precisePenalty, 0, 100));
        // Any tracked unproductive browsing means score cannot be perfect.
        if (unproductiveSecondsPrecise > 0) next = Math.min(next, 99);
        productivityScore = next;
    }

    let productivityExplanation =
        total > 0
            ? "We computed today’s score from your productive vs distracting minutes and how evenly you stayed on task across hours."
            : "Use the extension for a bit longer so we can calculate your daily score from today’s browsing.";
    if (productivityScore != null) {
        const topDistractions = computeTopDistractions(todayWebsites);
        const topSite = topDistractions[0]?.site;

        if (productivityScore >= 80) {
            productivityExplanation = `You dominated productive time with few distraction-heavy hours. Protect ${peakProdWindow || "your best window"} and keep context switches low.`;
        } else if (productivityScore >= 60) {
            productivityExplanation = `Productive time leads, but distractions spike around ${peakDistractionWindow || "the afternoon"}. Tighten focus during ${peakProdWindow || "your peak hours"}.`;
        } else {
            productivityExplanation = `Distractions show up more often than focus, especially around ${peakDistractionWindow || "your distraction peak"}. Start your next session during ${peakProdWindow || "your peak hours"} and limit ${topSite ? `${topSite}` : "repeat sites"}.`;
        }
    }

    const behavioralPatternSentence =
        peakProdWindow && peakDistractionWindow
            ? `You’re most productive in the ${peakProdWindow} window, while distractions peak around ${peakDistractionWindow}.`
            : "Your peak windows will appear once we have enough hourly tracking data.";

    const topDistractions = computeTopDistractions(todayWebsites);
    const distractionAlerts =
        topDistractions.length > 0
            ? topDistractions
                  .map((d, i) => `${i + 1}. ${d.site} - ${formatSecondsShort(d.wastedSeconds)}`)
                  .join("  ")
            : "Top distraction sites will show up after we detect a few unproductive categories today.";

    const primaryGoal = getPrimaryGoal(goals);

    let weeklySummary = "Weekly comparisons will appear once you have at least two tracked weeks.";
    let predictiveAnalytics = "Predictive insight will show after we have a week-vs-previous-week trend signal.";
    const confidenceLabel = computePredictionConfidence({ weekComparison, hourlyMetrics, cognitiveMetrics });

    if (weekComparison && weekComparison.current && weekComparison.previous) {
        const current = weekComparison.current;
        const previous = weekComparison.previous;

        if (Number(previous?.totalTime) > 0 || Number(current?.totalTime) > 0) {
            const prevScore = Number(previous?.scoreSafe ?? previous?.score ?? 0) || 0;
            const curScore = Number(current?.scoreSafe ?? current?.score ?? 0) || 0;
            const scoreDelta = curScore - prevScore;
            const prevHours = Number(previous?.productiveTime) / 3600;
            const curHours = Number(current?.productiveTime) / 3600;
            const deltaHours = curHours - prevHours;

            if (prevScore > 0) {
                const pct = (scoreDelta / prevScore) * 100;
                const improved = pct >= 0;
                const pctAbs = Math.abs(pct);
                const deltaSecondsAbs = Math.abs(Number(current?.productiveTime || 0) - Number(previous?.productiveTime || 0));
                const deltaPretty = formatHoursMinutesFromSeconds(deltaSecondsAbs);
                weeklySummary = `This week you ${improved ? "improved" : "declined"} your focus score by about ${pctAbs.toFixed(0)}% (${prevScore}% -> ${curScore}%). Productive time ${improved ? "increased" : "decreased"} by about ${deltaPretty}.`;
            } else {
                const deltaSecondsAbs = Math.abs(Number(current?.productiveTime || 0) - Number(previous?.productiveTime || 0));
                const deltaPretty = formatHoursMinutesFromSeconds(deltaSecondsAbs);
                weeklySummary = `This week your focus score is ${curScore}%. Compared to last week, productive time ${deltaHours >= 0 ? "increased" : "decreased"} by about ${deltaPretty}.`;
            }

            const latestLoad = Array.isArray(cognitiveMetrics) && cognitiveMetrics.length ? Number(cognitiveMetrics[cognitiveMetrics.length - 1]?.loadScore) : NaN;
            const cognitivePenaltyFactor = !Number.isFinite(latestLoad) ? 1 : latestLoad > 7 ? 1.15 : latestLoad < 4 ? 0.85 : 1;

            const predictedScore = clamp(Math.round(curScore + scoreDelta * 0.6), 0, 100);
            const change = predictedScore - curScore;
            const pctChange = curScore > 0 ? (change / curScore) * 100 : 0;
            const adjustedPct = pctChange * cognitivePenaltyFactor;

            const absAdj = Math.round(Math.abs(adjustedPct));
            predictiveAnalytics =
                absAdj <= 1
                    ? `If your pattern continues, your productivity next week should stay roughly steady (forecast ~${predictedScore}%). ${confidenceLabel}.`
                    : `If this pattern continues, your productivity next week may ${adjustedPct < 0 ? "drop" : "climb"} by about ${absAdj}% (forecast score ~${predictedScore}%). ${confidenceLabel}.`;
        }
    }

    const goalBasedInsights = computeGoalInsight(primaryGoal, peakProdWindow, focusSessionMinutes);

    const cognitiveLoadInsight = computeCognitiveLoadInsight(cognitiveMetrics);

    return {
        productivityScore,
        productivityExplanation,
        behavioralPatternSentence,
        peakProdWindow,
        peakDistractionWindow,
        topDistractionAlerts: distractionAlerts,
        weeklySummary,
        predictiveAnalytics,
        goalBasedInsights,
        cognitiveLoadInsight,
        topDistractions, // structured, for suggestions
        primaryGoal, // structured, for suggestions
    };
}

export { computeAiInsightsCoachReport, formatSecondsShort };

