import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GOAL_DOMAIN_OPTIONS } from "@/lib/livingHope/letterSections";
import { parseSteps, type LivingHopeGoalRow } from "@/lib/livingHope/api";
import { lh } from "@/lib/livingHope/themeClasses";

type Props = {
  goal: LivingHopeGoalRow;
  locked?: boolean;
  onPatch: (patch: Partial<LivingHopeGoalRow>) => void;
  onDelete: () => void;
};

export function GoalEditorCard({ goal, locked, onPatch, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const steps = parseSteps(goal.steps);

  const addStep = () => onPatch({ steps: [...steps, ""] });
  const setStep = (i: number, v: string) => {
    const next = [...steps];
    next[i] = v;
    onPatch({ steps: next });
  };
  const removeStep = (i: number) => onPatch({ steps: steps.filter((_, j) => j !== i) });

  return (
    <div className={cn(lh.card, "overflow-hidden")}>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-stone-900 truncate">{goal.title || "Untitled goal"}</p>
          <p className={cn("text-[12px] capitalize", lh.muted)}>{goal.domain}</p>
        </div>
        {open ? <ChevronUp className={cn("w-4 h-4", lh.faint)} /> : <ChevronDown className={cn("w-4 h-4", lh.faint)} />}
      </button>

      {open ? (
        <div className={cn("px-4 pb-4 space-y-3 pt-3", lh.divider)}>
          <div>
            <label className={cn(lh.labelUpper, "mb-1 block")}>Goal</label>
            <Input
              value={goal.title}
              disabled={locked}
              onChange={(e) => onPatch({ title: e.target.value })}
              className={lh.input}
              placeholder="What are you believing God for?"
            />
          </div>

          <div>
            <label className={cn(lh.labelUpper, "mb-1 block")}>Domain</label>
            <Select
              value={goal.domain}
              disabled={locked}
              onValueChange={(v) => onPatch({ domain: v as LivingHopeGoalRow["domain"] })}
            >
              <SelectTrigger className={lh.input}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_DOMAIN_OPTIONS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={cn(lh.labelUpper, "mb-1 block")}>Vivid detail</label>
            <Textarea
              value={goal.vivid_detail ?? ""}
              disabled={locked}
              onChange={(e) => onPatch({ vivid_detail: e.target.value })}
              rows={4}
              className={lh.textarea}
              placeholder="When God answers, what does it look and feel like? Present tense."
            />
          </div>

          <div>
            <label className={cn(lh.labelUpper, "mb-1 block")}>Target (optional)</label>
            <Input
              value={goal.target_metric ?? ""}
              disabled={locked}
              onChange={(e) => onPatch({ target_metric: e.target.value })}
              className={lh.input}
              placeholder="e.g. 2 books written, debt-free, daily prayer habit"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lh.labelUpper}>Fractal steps</label>
              {!locked ? (
                <button type="button" onClick={addStep} className={lh.accentLink}>
                  + step
                </button>
              ) : null}
            </div>
            <p className={cn("text-[12px] mb-2", lh.faint)}>
              Break the big goal into smaller moves — like Taylor Welch&apos;s fractal goals.
            </p>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={s}
                    disabled={locked}
                    onChange={(e) => setStep(i, e.target.value)}
                    className={cn(lh.input, "text-sm")}
                    placeholder={`Step ${i + 1}`}
                  />
                  {!locked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-stone-400 hover:text-red-600"
                      onClick={() => removeStep(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              {!steps.length && !locked ? (
                <button type="button" onClick={addStep} className={lh.dashedAdd}>
                  Add first step
                </button>
              ) : null}
            </div>
          </div>

          {!locked ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600/80 hover:text-red-700 hover:bg-red-50"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Remove goal
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
