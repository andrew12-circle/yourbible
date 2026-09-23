import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import {
  DAILY_ASSIGNMENT_FIELDS,
  type DailyAssignment,
} from "@/lib/livingHope/morningRitual";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { Button } from "@/components/ui/button";
import { parseRehearsalNote, rehearsalAction } from "@/lib/livingHope/sceneRehearsal";
import { cn } from "@/lib/utils";
import { lh } from "@/lib/livingHope/themeClasses";

type Props = {
  assignment: DailyAssignment;
  onChange: (patch: Partial<DailyAssignment>) => void;
  scriptureReflection: string;
  visionRecall: string;
  storyRecall: string;
  thanksgivingNow: string[];
  touches: Record<string, GoalTouch>;
  goals: LivingHopeGoalRow[];
};
function short(value: string, max = 180) {
  const clean = value.replace(/<!--[\s\S]*?-->/g, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
export function TodayAssignmentPanel({
  assignment, onChange, scriptureReflection, visionRecall, storyRecall, thanksgivingNow, touches, goals,
}: Props) {
  const obedience = goals.map((goal) => {
    const text = touches[goal.id]?.obedience_step?.trim();
    return text ? `${goal.title}: ${text}` : "";
  }).filter(Boolean);
  const sceneNote = parseRehearsalNote(storyRecall);
  const practice = sceneNote.action ? sceneNote : parseRehearsalNote(visionRecall);
  const action = rehearsalAction(visionRecall, storyRecall);
  const alreadyIncluded = Boolean(action && assignment.mustDo.includes(action));
  const cues = [
    scriptureReflection.trim() ? { label: "Scripture", text: short(scriptureReflection) } : null,
    visionRecall.trim() ? { label: "Vision", text: short(practice.title ? `${practice.title}: ${practice.identity || practice.action || "Guided rehearsal"}` : visionRecall) } : null,
    storyRecall.trim() ? { label: "Future scene", text: short(storyRecall) } : null,
    obedience.length ? { label: "Goal obedience", text: short(obedience.join(" · ")) } : null,
    thanksgivingNow.some((item) => item.trim())
      ? { label: "Gratitude", text: short(thanksgivingNow.filter((item) => item.trim()).join(" · ")) } : null,
  ].filter((item): item is { label: string; text: string } => Boolean(item));
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Turn the morning into a day.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Look back at what surfaced in worship, gratitude, Scripture, prayer, vision, and your goals.
          Then decide what faithfulness looks like before the day gets noisy.
        </p>
      </div>
      {action && <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h3 className="text-base font-semibold">Your action from rehearsal</h3>
        {practice.identity && <p className="text-sm text-muted-foreground">Practice: {practice.identity}</p>}
        <p className="text-base leading-relaxed">{action}</p>
        {practice.obstacle && practice.response && <p className="text-sm leading-relaxed">If {practice.obstacle}, then {practice.response}</p>}
        <Button type="button" variant="outline" className="min-h-11" disabled={alreadyIncluded} onClick={() => {
          if (!alreadyIncluded) onChange({ mustDo: [assignment.mustDo.trim(), action].filter(Boolean).join("\n") });
        }}>{alreadyIncluded ? "Included in today's assignment" : "Add to today's assignment"}</Button>
        <p className="text-xs text-muted-foreground">An action you chose—not a prediction or a claim of divine instruction. Existing assignments stay intact.</p>
      </div>}
      {cues.length ? (
        <details className="rounded-xl border border-border/60 bg-muted/20 p-3" open>
          <summary className="min-h-10 cursor-pointer text-sm font-medium">What surfaced this morning</summary>
          <div className="mt-2 space-y-2">{cues.map((cue) => (
            <div key={cue.label} className="text-sm leading-relaxed">
              <span className="font-medium text-foreground">{cue.label}: </span>
              <span className="text-muted-foreground">{cue.text}</span>
            </div>
          ))}</div>
        </details>
      ) : null}
      <div className="space-y-4">{DAILY_ASSIGNMENT_FIELDS.map((field) => (
        <div key={field.key}>
          <label className={cn(lh.label, "mb-1 block")}>{field.label}</label>
          <MorningVoiceField value={assignment[field.key]} onChange={(value) => onChange({ [field.key]: value })}
            label={field.label} placeholder={field.placeholder} multiline={field.key === "mustDo" || field.key === "avoid"} rows={2} />
        </div>
      ))}</div>
      {assignment.mustDo.trim() ? (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <p className={cn(lh.labelUpper, "mb-1")}>Your anchor for today</p>
          <p className="text-lg font-semibold leading-snug">{assignment.mustDo}</p>
          {assignment.avoid.trim() ? <p className="mt-2 text-sm text-muted-foreground">Protect it from: {assignment.avoid}</p> : null}
        </div>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        This is not a second to-do list. It is the small set of actions that best carries this morning into the rest of today.
      </p>
    </section>
  );
}
