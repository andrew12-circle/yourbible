import { useEffect } from "react";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { parseRehearsalNote, rehearsalAction } from "@/lib/livingHope/sceneRehearsal";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  visionRecall: string;
  value: string;
  onChange: (value: string) => void;
};

export function VisionActionBridge({ visionRecall, value, onChange }: Props) {
  const practice = parseRehearsalNote(visionRecall);
  const suggestedAction = rehearsalAction(visionRecall);

  useEffect(() => {
    if (!value.trim() && suggestedAction) onChange(suggestedAction);
  }, [onChange, suggestedAction, value]);

  return (
    <section className="space-y-5">
      <div>
        <p className={cn(lh.labelUpper, "mb-2")}>Bring it back to today</p>
        <h2 className="text-xl font-semibold">Act like it today.</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          The visualization is over. Do not build another scene. Bring one concrete action back into the day you are actually living.
        </p>
      </div>

      {practice.title ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className={cn(lh.labelUpper, "mb-1")}>Scene you just rehearsed</p>
          <p className="font-semibold">{practice.title}</p>
          {practice.identity ? (
            <p className="mt-1 text-sm text-muted-foreground">Who you practiced being: {practice.identity}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <p className={cn(lh.labelUpper, "mb-2")}>One question</p>
        <h3 className="mb-3 text-lg font-semibold">What does the man you just saw do today?</h3>
        <MorningVoiceField
          value={value}
          onChange={onChange}
          label="What does the man you just saw do today?"
          placeholder="One specific action you control today…"
          multiline
          rows={3}
        />
        {suggestedAction ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            We carried your action forward from the guided scene. Refine it here if the wording needs to be more concrete.
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Speak or type one action. Keep it specific, controllable, and doable today.
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        This answer will be available again in Today&apos;s Assignment so the vision turns into execution instead of another round of visualization.
      </p>
    </section>
  );
}
