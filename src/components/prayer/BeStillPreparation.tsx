import { Clock3, MapPin, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BeStillSession } from "@/lib/prayer/beStill";
import { isOneSentenceQuestion, readyForStillness } from "@/lib/prayer/beStill";

type Props = { session: BeStillSession; onChange: (patch: Partial<BeStillSession>) => void; disabled?: boolean };

export function BeStillPreparation({ session, onChange, disabled }: Props) {
  const validQuestion = isOneSentenceQuestion(session.question);
  return <fieldset disabled={disabled} className="space-y-7">
    <section className="space-y-3">
      <Label htmlFor="receiving-question" className="flex items-center gap-2 text-base font-semibold">
        <PenLine className="h-4 w-4" aria-hidden />Write one question before sitting
      </Label>
      <p className="text-sm text-muted-foreground">Reduce the question until it fits into a single clear sentence. Not a list of worries or a long request.</p>
      <Textarea id="receiving-question" rows={3} maxLength={300} required
        placeholder="What is the one thing I am asking?"
        value={session.question} onChange={(event) => onChange({ question: event.target.value })}
        aria-invalid={session.question.trim().length > 0 && !validQuestion} className="rounded-2xl p-4 text-base" />
      {session.question.trim() && !validQuestion ? <p role="alert" className="text-sm text-destructive">Write one question in a single sentence, without a list or separate sentences.</p> : null}
    </section>
    <section className="space-y-3">
      <p className="text-base font-semibold">Same place. Same hour.</p>
      <p className="text-sm text-muted-foreground">Choose the place and hour you intend to return to. These details are kept with your journal session.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="receiving-place" className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden />My quiet place</Label>
          <Input id="receiving-place" maxLength={150} required value={session.place} onChange={(event) => onChange({ place: event.target.value })}
            placeholder="The chair by the window" className="min-h-12" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receiving-hour" className="flex items-center gap-2"><Clock3 className="h-4 w-4" aria-hidden />My regular hour</Label>
          <Input id="receiving-hour" type="time" required value={session.hour} onChange={(event) => onChange({ hour: event.target.value })} className="min-h-12" />
        </div>
      </div>
    </section>
    <section className="space-y-3">
      <p className="text-base font-semibold">Before becoming still</p>
      <p className="text-sm text-muted-foreground">Prepare your space now, before putting the screen down.</p>
      {([
        ["handsEmpty", "I have written the question and am ready to set everything out of my hands."],
        ["interruptionsCleared", "I have arranged things so nothing is waiting to interrupt me."],
        ["dayPutAway", "I am ready to put away the hurry and activity of the day."],
      ] as const).map(([key, label]) =>
        <label key={key} className="flex min-h-12 items-start gap-3 rounded-xl border border-border/70 p-3 text-sm leading-relaxed">
          <input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={session[key]} onChange={(event) => onChange({ [key]: event.target.checked })} />
          <span>{label}</span>
        </label>,
      )}
    </section>
    <p role="status" className="text-center text-xs text-muted-foreground">{readyForStillness(session)
      ? "Your question and space are prepared. Begin the quiet period when ready."
      : "Complete the written question, place, hour, and preparation checks to begin."}</p>
  </fieldset>;
}
