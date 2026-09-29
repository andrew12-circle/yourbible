import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { morningNextLabel } from "@/lib/livingHope/morningSession";
import type { RitualStep } from "@/lib/livingHope/morningRitual";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

export function MorningSessionFooter({ steps, stepIndex, saving, blocked = false, onBack, onContinue }: {
  steps: RitualStep[]; stepIndex: number; saving: boolean; blocked?: boolean; onBack: () => void; onContinue: () => void;
}) {
  if (steps[stepIndex]?.kind === "done") return null;
  return <nav aria-label="Morning navigation" className="flex items-center gap-3">
    {stepIndex > 0 && <Button type="button" variant="ghost" disabled={saving || blocked}
      className="h-12 shrink-0 px-3 text-foreground hover:bg-muted hover:text-foreground motion-reduce:transition-none" onClick={onBack}>
      <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />Back
    </Button>}
    <Button type="button" className={cn(lh.btnPrimary, "min-w-0 flex-1 h-auto min-h-12 whitespace-normal py-2 motion-reduce:transition-none")} disabled={saving || blocked} onClick={onContinue}>
      {saving ? <><Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden /><span>Saving your morning…</span></> :
        <><span className="min-w-0">{blocked ? "Save or cancel your edit to continue" : morningNextLabel(steps, stepIndex)}</span><ChevronRight className="ml-2 h-4 w-4 shrink-0" aria-hidden /></>}
    </Button>
  </nav>;
}
