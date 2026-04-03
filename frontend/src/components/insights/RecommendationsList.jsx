import { Lightbulb } from "lucide-react";

export default function RecommendationsList({ items, className = "", highlightFirst = false }) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
        <div className={`rounded-2xl border border-secondary/25 bg-secondary/[0.06] p-4 ${className}`} role="region" aria-label="Recommendations">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-secondary">
                <Lightbulb size={14} className="shrink-0" aria-hidden />
                Recommendations
            </div>
            <ul className="space-y-2.5 text-sm font-medium leading-relaxed text-muted">
                {items.map((t, i) => (
                    <li
                        key={i}
                        className={`flex gap-2 rounded-xl ${highlightFirst && i === 0 ? "bg-primary/[0.08] ring-1 ring-primary/20 -mx-1 px-3 py-2.5" : ""}`}
                    >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                        <span className="text-foreground/85">
                            {highlightFirst && i === 0 ? (
                                <>
                                    <span className="mr-1.5 text-[9px] font-black uppercase tracking-wider text-primary">Try first</span>
                                    {t}
                                </>
                            ) : (
                                t
                            )}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
