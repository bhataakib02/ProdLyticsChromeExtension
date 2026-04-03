import { Brain } from "lucide-react";

export default function InsightText({ children, className = "" }) {
    return (
        <div
            className={`rounded-2xl border border-white/10 bg-foreground/[0.04] p-4 ${className}`}
            role="region"
            aria-label="AI insight"
        >
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                <Brain size={14} className="shrink-0" aria-hidden />
                AI insight
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground/90">{children}</p>
        </div>
    );
}
