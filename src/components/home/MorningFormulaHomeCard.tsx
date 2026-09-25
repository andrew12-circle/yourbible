import { Link } from "react-router-dom";
import { ChevronRight, Settings2, Sunrise } from "lucide-react";
import { useMorningFormulaEntry } from "@/hooks/useMorningFormulaEntry";

/** Prominent entry on the home widgets page — morning review + workbook. */
export function MorningFormulaHomeCard() {
  const { entry } = useMorningFormulaEntry();

  return (
    <div className="mb-3 overflow-hidden rounded-[22px] border border-border/60 bg-card">
      <Link
        to={entry.href}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Sunrise className="h-6 w-6 text-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Morning formula
          </p>
          <p className="text-[15px] font-semibold leading-snug text-foreground">{entry.headline}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{entry.subline}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        to="/living-hope/builder"
        className="flex min-h-11 items-center justify-center gap-2 border-t border-border/60 px-4 text-sm font-medium text-primary transition-colors hover:bg-muted/30"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        Edit Morning Formula
      </Link>
    </div>
  );
}
