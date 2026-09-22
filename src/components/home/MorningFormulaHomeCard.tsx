import { Link } from "react-router-dom";
import { ChevronRight, Sunrise } from "lucide-react";
import { useMorningFormulaEntry } from "@/hooks/useMorningFormulaEntry";

/** Prominent entry on the home widgets page — morning review + workbook. */
export function MorningFormulaHomeCard() {
  const { entry } = useMorningFormulaEntry();

  return (
    <Link
      to={entry.href}
      className="w-full flex items-center gap-3 p-4 mb-3 rounded-[22px] bg-card border border-border/60 hover:bg-muted/30 transition-colors text-left"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Sunrise className="h-6 w-6 text-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Morning formula</p>
        <p className="text-[15px] font-semibold text-foreground leading-snug">{entry.headline}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{entry.subline}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden />
    </Link>
  );
}
