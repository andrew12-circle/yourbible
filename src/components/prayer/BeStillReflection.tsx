import { BookOpen, CalendarDays, Footprints, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BeStillSession } from "@/lib/prayer/beStill";

type Props = { session: BeStillSession; onChange: (patch: Partial<BeStillSession>) => void; disabled?: boolean };

export function BeStillReflection({ session, onChange, disabled }: Props) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-7">
    <div className="space-y-3">
      <Label htmlFor="be-still-reflection" className="flex items-center gap-2 text-base"><PenLine className="h-4 w-4" aria-hidden />What came to mind?</Label>
      <p id="be-still-reflection-help" className="text-sm leading-relaxed text-muted-foreground">A thought, a feeling, a Scripture reference, or simply the experience of being still. Use your own words.</p>
      <Textarea id="be-still-reflection" value={session.reflection} onChange={(event) => onChange({ reflection: event.target.value })}
        aria-describedby="be-still-reflection-help" placeholder="What I noticed…" rows={6} maxLength={12000} className="resize-y rounded-2xl p-4 text-base leading-relaxed" />
    </div>
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-medium">How would you like to leave this?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {([{ value: "noted", label: "Something to reflect on" }, { value: "nothing-clear", label: "Nothing clear today" }] as const).map((option) => (
          <label key={option.value} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors", session.outcome === option.value ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40")}>
            <input type="radio" name="be-still-outcome" value={option.value} checked={session.outcome === option.value}
              onChange={() => onChange({ outcome: option.value })} className="h-4 w-4 accent-primary" />
            {option.label}
          </label>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">You can finish without writing anything. Time in prayer is enough.</p>
    </fieldset>
    <details className="rounded-2xl border border-border/70 px-4 sm:px-5">
      <summary className="min-h-12 cursor-pointer py-4 text-sm font-medium">Scripture, a next step, or a date to revisit <span className="font-normal text-muted-foreground">(optional)</span></summary>
      <div className="space-y-5 pb-5 pt-1">
        <div className="space-y-2">
          <Label htmlFor="be-still-scripture" className="flex items-center gap-2"><BookOpen className="h-4 w-4" aria-hidden />Scripture to revisit</Label>
          <Input id="be-still-scripture" value={session.scripture} maxLength={1000} onChange={(event) => onChange({ scripture: event.target.value })} placeholder="A passage or reference to read again" className="min-h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="be-still-next-step" className="flex items-center gap-2"><Footprints className="h-4 w-4" aria-hidden />One next step</Label>
          <Textarea id="be-still-next-step" value={session.nextStep} maxLength={3000} onChange={(event) => onChange({ nextStep: event.target.value })} rows={2} placeholder="A practical step, a conversation, or time to wait" className="rounded-xl text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="be-still-review-date" className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden />Date to revisit</Label>
          <Input id="be-still-review-date" type="date" value={session.reviewDate} onChange={(event) => onChange({ reviewDate: event.target.value })} className="min-h-12 max-w-xs" />
          <p className="text-xs text-muted-foreground">Kept in this journal entry for your later review.</p>
        </div>
      </div>
    </details>
    <div className="rounded-2xl bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">Give it time and discernment.</p>
      <p>How does this fit with Scripture and the character of Jesus? What might time or trusted counsel help you understand?</p>
    </div>
  </fieldset>;
}
