import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BeStillSession, BeStillPictureKind } from "@/lib/prayer/beStill";
import { cn } from "@/lib/utils";

type Props = { session: BeStillSession; onChange: (patch: Partial<BeStillSession>) => void; disabled?: boolean };
const OPTIONS: { id: BeStillPictureKind; label: string; prompt: string }[] = [
  { id: "person", label: "A person", prompt: "See the person clearly in your mind." },
  { id: "choice", label: "A choice", prompt: "See both roads, not only the one you prefer." },
  { id: "situation", label: "A situation", prompt: "See the specific situation clearly, without adding an answer." },
];

export function BeStillVisualization({ session, onChange, disabled }: Props) {
  const prompt = OPTIONS.find(({ id }) => id === session.pictureKind)?.prompt ?? OPTIONS[2].prompt;
  return <fieldset disabled={disabled} className="space-y-5">
    <blockquote className="rounded-2xl bg-primary/5 p-5 font-serif text-xl leading-relaxed">{session.question}</blockquote>
    <p className="text-base font-medium">You must see the question.</p>
    <p className="text-sm text-muted-foreground">The account describes giving the question a clear mental picture, not simply thinking it in words.</p>
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ id, label }) => <label key={id} className={cn("flex min-h-12 cursor-pointer items-center justify-center rounded-xl border p-2 text-center text-sm", session.pictureKind === id ? "border-primary bg-primary/5 text-primary" : "border-border")}>
        <input type="radio" name="receiving-picture-kind" className="sr-only" checked={session.pictureKind === id} onChange={() => onChange({ pictureKind: id })} />
        {label}
      </label>)}
    </div>
    <p className="rounded-xl bg-muted/40 p-5 text-center font-serif text-xl">{prompt}</p>
    <div className="space-y-2">
      <Label htmlFor="receiving-picture">Describe what you pictured (optional)</Label>
      <Textarea id="receiving-picture" rows={3} maxLength={6000} value={session.picture}
        onChange={(event) => onChange({ picture: event.target.value })} placeholder="What I can see clearly…" />
      <p className="text-xs text-muted-foreground">The picture is held in your mind; describing it is not required.</p>
    </div>
  </fieldset>;
}
