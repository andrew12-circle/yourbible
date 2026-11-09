import { BookOpen, CalendarDays, Footprints, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BeStillSession, BeStillThoughtOrigin, BeStillQualities } from "@/lib/prayer/beStill";

type Props = { session: BeStillSession; onChange: (patch: Partial<BeStillSession>) => void; disabled?: boolean };

const TYPES: { value: BeStillThoughtOrigin; label: string; description: string }[] = [
  { value: "reasoned", label: "A thought I built", description: "I assembled it piece by piece through deliberate reasoning." },
  { value: "arrived", label: "A thought that arrived whole", description: "It seemed suddenly complete, without consciously building it." },
  { value: "uncertain", label: "I cannot tell", description: "I am not sure how the thought formed." },
  { value: "none", label: "Nothing clear today", description: "No clear thought arrived during or after the quiet period." },
];
const QUALITIES: { key: keyof BeStillQualities; text: string }[] = [
  { key: "whole", text: "It appeared complete, with its parts already in place." },
  { key: "calm", text: "It came calmly, without excitement or pride." },
  { key: "notFlattering", text: "It had no apparent interest in pleasing or flattering me." },
  { key: "challengedWishes", text: "It challenged something I wanted to hear." },
  { key: "asksSomething", text: "It asked something of me." },
];

export function BeStillReflection({ session, onChange, disabled }: Props) {
  return <fieldset disabled={disabled} className="min-w-0 space-y-7">
    <section className="space-y-3">
      <Label htmlFor="be-still-reflection" className="flex items-center gap-2 text-base"><PenLine className="h-4 w-4" aria-hidden />What came to mind?</Label>
      <p id="be-still-reflection-help" className="text-sm leading-relaxed text-muted-foreground">
        Record the thought as it came, without revising it into something more impressive. Ordinary reasoning belongs in the ledger too.
      </p>
      <Textarea id="be-still-reflection" value={session.reflection}
        onChange={(event) => onChange({ reflection: event.target.value })}
        aria-describedby="be-still-reflection-help" placeholder="What I noticed…" rows={6}
        maxLength={12000} className="resize-y rounded-2xl p-4 text-base leading-relaxed" />
    </section>
    <fieldset className="space-y-3">
      <legend className="mb-3 text-base font-semibold">Which kind of thought was it?</legend>
      <div className="space-y-2">
        {TYPES.map(({ value, label, description }) => <label key={value} className={cn(
          "flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
          session.thoughtOrigin === value ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40",
        )}>
          <input type="radio" name="be-still-thought-origin" value={value}
            checked={session.thoughtOrigin === value} onChange={() => onChange({
              thoughtOrigin: value, outcome: value === "none" ? "nothing-clear" : "noted",
            })} className="mt-1 h-4 w-4 accent-primary" />
          <span><span className="block font-medium">{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></span>
        </label>)}
      </div>
    </fieldset>
    {session.thoughtOrigin === "arrived" ? <fieldset className="space-y-3">
      <legend className="text-base font-semibold">What character did the arriving thought have?</legend>
      <p className="text-sm text-muted-foreground">The transcript describes these signs. Select only what you actually noticed; they are observations, not proof.</p>
      {QUALITIES.map(({ key, text }) => <label key={key} className="flex min-h-11 items-start gap-3 rounded-xl p-2 text-sm leading-relaxed">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={session.qualities[key]}
          onChange={(event) => onChange({ qualities: { ...session.qualities, [key]: event.target.checked } })} />
        <span>{text}</span>
      </label>)}
    </fieldset> : null}
    <details className="rounded-2xl border border-border/70 px-4 sm:px-5">
      <summary className="min-h-12 cursor-pointer py-4 text-sm font-medium">Scripture, a next step, or a date to revisit <span className="font-normal text-muted-foreground">(optional)</span></summary>
      <div className="space-y-5 pb-5 pt-1">
        <div className="space-y-2">
          <Label htmlFor="be-still-scripture" className="flex items-center gap-2"><BookOpen className="h-4 w-4" aria-hidden />Scripture to revisit</Label>
          <Input id="be-still-scripture" value={session.scripture} maxLength={1000}
            onChange={(event) => onChange({ scripture: event.target.value })} placeholder="A passage or reference to read again" className="min-h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="be-still-next-step" className="flex items-center gap-2"><Footprints className="h-4 w-4" aria-hidden />One next step</Label>
          <Textarea id="be-still-next-step" value={session.nextStep} maxLength={3000}
            onChange={(event) => onChange({ nextStep: event.target.value })} rows={2}
            placeholder="Something to do, or time to wait" className="rounded-xl text-base" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="be-still-review-date" className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden />Date to revisit</Label>
          <Input id="be-still-review-date" type="date" value={session.reviewDate}
            onChange={(event) => onChange({ reviewDate: event.target.value })} className="min-h-12 max-w-xs" />
          <p className="text-xs text-muted-foreground">This date is saved to the ledger; it does not schedule a notification.</p>
        </div>
      </div>
    </details>
    <div className="rounded-2xl bg-muted/40 p-5 text-sm leading-relaxed text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">Record first. Test later.</p>
      <p>The account describes comparing these observations over months and marking what proved true. Not every thought that seems to arrive whole is right. Return to the ledger with evidence and mark the outcome yourself.</p>
    </div>
  </fieldset>;
}
