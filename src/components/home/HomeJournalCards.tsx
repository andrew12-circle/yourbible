import { useNavigate } from "react-router-dom";
import { Lightbulb, Calendar as CalIcon } from "lucide-react";

interface HomeJournalCardsProps {
  todayPrompt: { id: string; text: string } | null;
  onThisDayCount: number;
  variant?: "ios" | "hub";
}

export function HomeJournalCards({ todayPrompt, onThisDayCount, variant = "ios" }: HomeJournalCardsProps) {
  const navigate = useNavigate();

  const cardClass =
    variant === "hub"
      ? "w-full text-left mb-3 p-4 rounded-xl border border-border/50 bg-card shadow-sm hover:border-primary/30 hover:shadow-md transition"
      : "w-full text-left mb-3 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition";

  const promptLabelClass =
    variant === "hub"
      ? "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 mb-1.5"
      : "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 mb-1.5";

  const onThisDayLabelClass =
    variant === "hub"
      ? "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-violet-600 mb-1.5"
      : "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 mb-1.5";

  const textClass =
    variant === "hub"
      ? "text-[15px] font-medium leading-snug text-foreground"
      : "text-[15px] font-medium leading-snug text-zinc-900";

  return (
    <>
      {todayPrompt && (
        <button
          type="button"
          onClick={() =>
            navigate(`/journal/new?promptId=${todayPrompt.id}&prompt=${encodeURIComponent(todayPrompt.text)}`)
          }
          className={cardClass}
        >
          <div className={promptLabelClass}>
            <Lightbulb className="w-3.5 h-3.5" /> Today&apos;s prompt
          </div>
          <p className={textClass}>{todayPrompt.text}</p>
        </button>
      )}
      {onThisDayCount > 0 && (
        <button type="button" onClick={() => navigate("/journal/today")} className={cardClass}>
          <div className={onThisDayLabelClass}>
            <CalIcon className="w-3.5 h-3.5" /> On this day
          </div>
          <p className={textClass}>
            {onThisDayCount} {onThisDayCount === 1 ? "entry" : "entries"} from past years
          </p>
        </button>
      )}
    </>
  );
}
