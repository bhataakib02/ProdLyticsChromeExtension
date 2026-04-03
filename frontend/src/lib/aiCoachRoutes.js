/** Slugs match `/insights/ai-coach/[feature]` — 7 AI Coach features. */
export const AI_COACH_FEATURES = [
    { slug: "smart-productivity-score", title: "Smart Productivity Score", short: "Score" },
    { slug: "behavioral-patterns", title: "Behavioral Pattern Detection", short: "Patterns" },
    { slug: "distraction-alerts", title: "Distraction Alerts", short: "Alerts" },
    { slug: "personalized-suggestions", title: "Personalized Suggestions", short: "Tips" },
    { slug: "weekly-report", title: "Weekly Report", short: "Weekly" },
    { slug: "predictive-analytics", title: "Predictive Analytics", short: "Forecast" },
    { slug: "goal-insights", title: "Goal-Based Insights", short: "Goals" },
];

export const AI_COACH_SLUGS = new Set(AI_COACH_FEATURES.map((f) => f.slug));

export function getAiCoachFeatureMeta(slug) {
    return AI_COACH_FEATURES.find((f) => f.slug === slug) || null;
}
