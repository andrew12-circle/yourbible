import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import {
  VISION_EMBODIMENT_INTRO,
  VISION_EMBODIMENT_STEPS,
  composeVisionEmbodiment,
  parseVisionEmbodiment,
  type VisionEmbodimentKey,
  type VisionEmbodimentResponses,
} from "@/lib/livingHope/visionEmbodiment";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  workbook: LivingHopeWorkbookContent;
  visionRecall: string;
  onVisionRecallChange: (value: string) => void;
};

export function VisionEmbodimentWalkthrough({ workbook, visionRecall, onVisionRecallChange }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState<VisionEmbodimentResponses>(() =>
    parseVisionEmbodiment(visionRecall),
  );

  const totalSteps = 1 + VISION_EMBODIMENT_STEPS.length;
  const onIntro = stepIndex === 0;
  const sensoryIndex = stepIndex - 1;
  const currentStep = sensoryIndex >= 0 ? VISION_EMBODIMENT_STEPS[sensoryIndex] : null;

  const syncToParent = useCallback(
    (next: VisionEmbodimentResponses) => {
      onVisionRecallChange(composeVisionEmbodiment(workbook, next));
    },
    [workbook, onVisionRecallChange],
  );

  const setField = useCallback(
    (key: VisionEmbodimentKey, value: string) => {
      setResponses((prev) => {
        const next = { ...prev, [key]: value };
        syncToParent(next);
        return next;
      });
    },
    [syncToParent],
  );

  const progress = useMemo(() => stepIndex / Math.max(1, totalSteps - 1), [stepIndex, totalSteps]);

  const lifestyleHint =
    workbook.lifestyle.length > 0
      ? workbook.lifestyle.slice(0, 2).join(" · ")
      : workbook.vision_tagline?.trim() || null;

  return (
    <div className="flex flex-col">
      <div className={cn(lh.progress, "mb-4")}>
        <div className={lh.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>

      {onIntro ? (
        <div className="space-y-4">
          <p className={cn(lh.bodySm, "leading-relaxed")}>{VISION_EMBODIMENT_INTRO.body}</p>
          {workbook.vision_headline ? (
            <div className={cn(lh.visionBanner, "space-y-2")}>
              <p className={cn(lh.labelUpper, lh.accent)}>Your vision</p>
              <p className={cn(lh.bodyQuote, "text-[16px] not-italic")}>{workbook.vision_headline}</p>
              {workbook.income_lines.length > 0 ? (
                <ul className={cn("space-y-0.5 text-[13px]", lh.muted)}>
                  {workbook.income_lines.map((l) => (
                    <li key={l.id}>
                      {l.label}: <span className={lh.accentMuted}>{l.amount}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {workbook.income_total_label ? (
                <p className={cn("text-[14px] font-semibold", lh.accent)}>{workbook.income_total_label}</p>
              ) : null}
            </div>
          ) : null}
          {lifestyleHint ? (
            <p className={cn(lh.footnote, "px-1")}>Lifestyle cue: {lifestyleHint}</p>
          ) : null}
        </div>
      ) : currentStep ? (
        <div className="space-y-3">
          <div>
            <p className={cn(lh.labelUpper, "mb-1")}>
              {sensoryIndex + 1} of {VISION_EMBODIMENT_STEPS.length}
            </p>
            <h2 className={cn(lh.titleMd, "mb-1")}>{currentStep.title}</h2>
            <p className={cn(lh.footnote, "italic leading-snug")}>{currentStep.psychology}</p>
          </div>
          <p className={cn(lh.bodySm)}>{currentStep.prompt}</p>
          <Textarea
            value={responses[currentStep.key]}
            onChange={(e) => setField(currentStep.key, e.target.value)}
            rows={currentStep.rows}
            className={lh.textarea}
            placeholder={currentStep.placeholder}
            aria-label={currentStep.title}
          />
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className={cn(lh.btnGhost, "h-10 px-3")}
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="w-4 h-4 mr-0.5" />
          Back
        </Button>
        {stepIndex < totalSteps - 1 ? (
          <Button
            type="button"
            className={cn(lh.btnSecondary, "h-10 px-4")}
            onClick={() => setStepIndex((i) => Math.min(totalSteps - 1, i + 1))}
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        ) : (
          <span className={cn(lh.footnote, "text-right")}>Tap Continue below when ready</span>
        )}
      </div>
    </div>
  );
}
