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
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-white truncate">{goal.title || "Untitled goal"}</p>
          <p className="text-[12px] text-white/45 capitalize">{goal.domain}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>

      {open ? (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 mb-1 block">Goal</label>
            <Input
              value={goal.title}
              disabled={locked}
              onChange={(e) => onPatch({ title: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder="What are you believing God for?"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 mb-1 block">Domain</label>
            <Select
              value={goal.domain}
              disabled={locked}
              onValueChange={(v) => onPatch({ domain: v as LivingHopeGoalRow["domain"] })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
            <label className="text-[11px] uppercase tracking-wider text-white/45 mb-1 block">Vivid detail</label>
            <Textarea
              value={goal.vivid_detail ?? ""}
              disabled={locked}
              onChange={(e) => onPatch({ vivid_detail: e.target.value })}
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              placeholder="When God answers, what does it look and feel like? Present tense."
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/45 mb-1 block">Target (optional)</label>
            <Input
              value={goal.target_metric ?? ""}
              disabled={locked}
              onChange={(e) => onPatch({ target_metric: e.target.value })}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              placeholder="e.g. 2 books written, debt-free, daily prayer habit"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] uppercase tracking-wider text-white/45">Fractal steps</label>
              {!locked ? (
                <button type="button" onClick={addStep} className="text-[11px] text-amber-300/80 hover:text-amber-200">
                  + step
                </button>
              ) : null}
            </div>
            <p className="text-[12px] text-white/40 mb-2">Break the big goal into smaller moves — like Taylor Welch&apos;s fractal goals.</p>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={s}
                    disabled={locked}
                    onChange={(e) => setStep(i, e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm"
                    placeholder={`Step ${i + 1}`}
                  />
                  {!locked ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-white/40 hover:text-red-300"
                      onClick={() => removeStep(i)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              {!steps.length && !locked ? (
                <button
                  type="button"
                  onClick={addStep}
                  className={cn(
                    "w-full rounded-xl border border-dashed border-white/15 py-2 text-[13px] text-white/45",
                    "hover:border-white/25 hover:text-white/65 transition",
                  )}
                >
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
              className="text-red-300/80 hover:text-red-200 hover:bg-red-500/10"
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
