import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import {
  DAILY_ASSIGNMENT_FIELDS,
  dailyAssignmentDisplayLabel,
  type DailyAssignment,
} from "@/lib/livingHope/morningRitual";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
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
  const clean = value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function TodayAssignmentPanel({
  assignment,
  onChange,
  scriptureReflection,
  visionRecall,
  storyRecall,
  thanksgivingNow,
  touches,
  goals,
}: Props) {
  const obedience = goals
    .map((goal) => {
      const text = touches[goal.id]?.obedience_step?.trim();
      return text ? `${goal.title}: ${text}` : "";
    })
    .filter(Boolean);

  const cues = [
    scriptureReflection.trim() ? { label: "Scripture", text: short(scriptureReflection) } : null,
    visionRecall.trim() ? { label: "Vision", text: short(visionRecall) } : null,
    storyRecall.trim() ? { label: "Future scene", text: short(storyRecall) } : null,
    obedience.length ? { label: "Goal obedience", text: short(obedience.join(" · ")) } : null,
    thanksgivingNow.some((item) => item.trim())
      ? { label: "Gratitude", text: short(thanksgivingNow.filter((item) => item.trim()).join(" · ")) }
      : null,
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

      {cues.length ? (
        <details className="rounded-xl border border-border/60 bg-muted/20 p-3" open>
          <summary className="min-h-10 cursor-pointer text-sm font-medium">What surfaced this morning</summary>
          <div className="mt-2 space-y-2">
            {cues.map((cue) => (
              <div key={cue.label} className="text-sm leading-relaxed">
                <span className="font-medium text-foreground">{cue.label}: </span>
                <span className="text-muted-foreground">{cue.text}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <div className="space-y-4">
        {DAILY_ASSIGNMENT_FIELDS.map((field) => (
          <div key={field.key}>
            <label className={cn(lh.label, "mb-1 block")}>{field.label}</label>
            <MorningVoiceField
              value={assignment[field.key]}
              onChange={(value) => onChange({ [field.key]: value })}
              label={field.label}
              placeholder={field.placeholder}
              multiline={field.key === "mustDo" || field.key === "avoid"}
              rows={2}
            />
          </div>
        ))}
      </div>

      {assignment.mustDo.trim() ? (
        <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <p className={cn(lh.labelUpper, "mb-1")}>Your anchor for today</p>
          <p className="text-lg font-semibold leading-snug">{assignment.mustDo}</p>
          {assignment.avoid.trim() ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Protect it from: {assignment.avoid}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        This is not a second to-do list. It is the small set of actions that best carries this morning into the rest of today.
      </p>
    </section>
  );
}
