import InsightText from "./InsightText";
import RecommendationsList from "./RecommendationsList";

export default function InsightCoachCard({
    title,
    insight,
    recommendations,
    footnote,
    highlightFirstAction = true,
    className = "",
}) {
    if (!insight && (!recommendations || recommendations.length === 0)) return null;
    return (
        <div className={`mt-6 space-y-4 ${className}`}>
            {title ? (
                <h4 className="text-[10px] font-black uppercase tracking-[0.35em] text-muted/90">{title}</h4>
            ) : null}
            {insight ? <InsightText>{insight}</InsightText> : null}
            <RecommendationsList items={recommendations} highlightFirst={highlightFirstAction && recommendations?.length > 1} />
            {footnote ? (
                <p className="text-[10px] font-medium leading-relaxed text-muted/75 border-t-ui-muted pt-3">{footnote}</p>
            ) : null}
        </div>
    );
}
