import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { morningNextLabel } from "@/lib/livingHope/morningSession";
import type { RitualStep } from "@/lib/livingHope/morningRitual";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

export function MorningSessionFooter({ steps, stepIndex, saving, onBack, onContinue }: {
  steps: RitualStep[]; stepIndex: number; saving: boolean; onBack: () => void; onContinue: () => void;
}) {
  if (steps[stepIndex]?.kind === "done") return null;
  return <nav aria-label="Morning navigation" className="flex items-center gap-3">
    {stepIndex > 0 && <Button type="button" variant="ghost" disabled={saving} className="h-12 shrink-0 px-3" onClick={onBack}>
      <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />Back
    </Button>}
    <Button type="button" className={cn(lh.btnPrimary, "min-w-0 flex-1 h-auto min-h-12 whitespace-normal py-2")} disabled={saving} onClick={onContinue}>
      {saving ? <><Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden /><span>Saving your morning…</span></> :
        <><span className="min-w-0">{morningNextLabel(steps, stepIndex)}</span><ChevronRight className="ml-2 h-4 w-4 shrink-0" aria-hidden /></>}
    </Button>
  </nav>;
}
