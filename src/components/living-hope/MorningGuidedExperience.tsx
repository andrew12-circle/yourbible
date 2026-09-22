import { MorningWorshipMusic } from "./MorningWorshipMusic";
import { MorningWorshipGuide } from "./MorningWorshipGuide";
import { MorningScriptureReading } from "./MorningScriptureReading";
import { MorningPrayerHelp } from "./MorningPrayerHelp";
import { MorningPrayerReader } from "./MorningPrayerReader";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MorningGuidedCoach } from "@/components/living-hope/MorningGuidedCoach";
import { MorningFormulaDurationPicker } from "@/components/living-hope/MorningFormulaSessionTimer";
import { MorningConversationPanel } from "@/components/living-hope/MorningConversationPanel";
import { MorningStoryPanel } from "@/components/living-hope/MorningStoryPanel";
import { ThanksgivingListsInput } from "@/components/living-hope/ThanksgivingListsInput";
import { VisionEmbodimentWalkthrough } from "@/components/living-hope/VisionEmbodimentWalkthrough";
import type { MorningScripture } from "@/hooks/useMorningScripture";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import {
  COVERING_PRAYER_PROMPTS,
  COVERING_STEP_INTRO,
} from "@/lib/livingHope/coveringPrayer";
import {
  DAILY_ASSIGNMENT_FIELDS,
  SURRENDER_STEP_INTRO,
  type DailyAssignment,
  type RitualStep,
} from "@/lib/livingHope/morningRitual";
import {
  buildGuidedIntroMessage,
  GUIDED_COACH_COPY,
  guidedCoachBeatForStep,
} from "@/lib/livingHope/morningGuidedRitual";
import type { SessionDurationMin } from "@/lib/livingHope/morningFormulaTimer";
import type { LivingHopeWorkbookContent, WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  step: RitualStep;
  formalName: string;
  letter: LivingHopeLetterRow | null;
  workbook: LivingHopeWorkbookContent | null;
  manifestoItem: { text: string } | null | undefined;
  storySuggestedIndex: number;
  storySelectedIndex: number | null;
  onStorySelectedIndexChange: (index: number) => void;
  onAddStory: (text: string) => void;
  storyRecall: string;
  setStoryRecall: (v: string) => void;
  currentGoal: LivingHopeGoalRow | null | undefined;
  touches: Record<string, GoalTouch>;
  setTouch: (goalId: string, patch: Partial<GoalTouch>) => void;
  visionRecall: string;
  setVisionRecall: (v: string) => void;
  metricValues: Record<string, string>;
  setMetricValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  thanksgivingNow: string[];
  thanksgivingNotYet: string[];
  onThanksgivingNowChange: (index: number, value: string) => void;
  onThanksgivingNotYetChange: (index: number, value: string) => void;
  conversationEntryId: string | null;
  conversationPreview: { title: string | null; excerpt: string } | null;
  conversationBusy: boolean;
  conversationError: string | null;
  ensureConversationEntry: () => Promise<string | null>;
  scriptureReflection: string;
  setScriptureReflection: (v: string) => void;
  dailyAssignment: DailyAssignment;
  setDailyAssignment: (patch: Partial<DailyAssignment>) => void;
  surrender: string;
  setSurrender: (v: string) => void;
  covering: string;
  setCovering: (v: string) => void;
  scripture: MorningScripture | null;
  scriptureBusy: boolean;
  scriptureError: string | null;
  onGenerateScripture: () => void;
  journalEntryId: string | null;
  worshipPlaylistUrl: string;
  worshipPlaylistHistory: WorshipMusicHistoryItem[];
  onWorshipMusicChange: (next: { url: string; history: WorshipMusicHistoryItem[] }) => void;
  onSwitchToStructured: () => void;
  canGoBack: boolean;
  onGoBack: () => void;
  onContinue: () => void;
  saving: boolean;
  isLastStep: boolean;
  stepBudgetMs: number;
  stepRemainingMs: number;
  stepExpired: boolean;
  durationMin: SessionDurationMin;
  onDurationChange: (next: SessionDurationMin) => void;
};

export function MorningGuidedExperience({
  step,
  formalName,
  letter,
  workbook,
  manifestoItem,
  storySuggestedIndex,
  storySelectedIndex,
  onStorySelectedIndexChange,
  onAddStory,
  storyRecall,
  setStoryRecall,
  currentGoal,
  touches,
  setTouch,
  visionRecall,
  setVisionRecall,
  metricValues,
  setMetricValues,
  thanksgivingNow,
  thanksgivingNotYet,
  onThanksgivingNowChange,
  onThanksgivingNotYetChange,
  conversationEntryId,
  conversationPreview,
  conversationBusy,
  conversationError,
  scriptureReflection,
  setScriptureReflection,
  dailyAssignment,
  setDailyAssignment,
  surrender,
  setSurrender,
  covering,
  setCovering,
  scripture,
  scriptureBusy,
  scriptureError,
  onGenerateScripture,
  worshipPlaylistUrl,
  worshipPlaylistHistory,
  onWorshipMusicChange,
  stepBudgetMs,
  durationMin,
  onDurationChange,
}: Props) {
  const beat = guidedCoachBeatForStep(step);
  const selectedStory =
    storySelectedIndex != null && workbook?.stories[storySelectedIndex]
      ? workbook.stories[storySelectedIndex]
      : null;

  const introMessage = useMemo(() => buildGuidedIntroMessage(formalName), [formalName]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      {beat === "intro" ? (
        <MorningGuidedCoach>{introMessage}</MorningGuidedCoach>
      ) : beat && beat !== "done" && beat !== "worship_start" && GUIDED_COACH_COPY[beat] ? (
        <MorningGuidedCoach>{GUIDED_COACH_COPY[beat]}</MorningGuidedCoach>
      ) : beat === "worship_start" ? (
        <MorningGuidedCoach>
          Put on your worship music. Take a breath and turn your attention to God.
        </MorningGuidedCoach>
      ) : null}

      {step.kind === "intro" ? (
        <MorningFormulaDurationPicker durationMin={durationMin} onDurationChange={onDurationChange} />
      ) : null}

      {step.kind === "intro" && (letter?.full_letter ?? letter?.outlook) ? (
        <details><summary className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground">A reminder from your foundation</summary><blockquote className={lh.quote}>{letter.full_letter ?? letter.outlook}</blockquote></details>
      ) : null}

      {step.kind === "worship" ? (
        <div className="space-y-6">
          <MorningWorshipMusic url={worshipPlaylistUrl} history={worshipPlaylistHistory} onChange={onWorshipMusicChange} />
          <MorningWorshipGuide stepBudgetMs={stepBudgetMs} />
        </div>
      ) : null}

      {step.kind === "thanksgiving" && <ThanksgivingListsInput
        thanksgivingNow={thanksgivingNow} thanksgivingNotYet={thanksgivingNotYet}
        onThanksgivingNowChange={onThanksgivingNowChange} onThanksgivingNotYetChange={onThanksgivingNotYetChange} />}
      {step.kind === "scripture" && <MorningScriptureReading scripture={scripture} busy={scriptureBusy} error={scriptureError}
        onRetry={onGenerateScripture} reflection={scriptureReflection} onReflectionChange={setScriptureReflection} />}
      {step.kind === "prayer" && <>
        <MorningConversationPanel entryId={conversationEntryId} preview={conversationPreview} busy={conversationBusy} error={conversationError} />
        <MorningPrayerHelp entryId={conversationEntryId} />
      </>}

      {step.kind === "manifesto" && manifestoItem ? (
        <p className={cn(lh.bodyQuote, "text-[18px]")}>{manifestoItem.text}</p>
      ) : null}

      {step.kind === "vision" && workbook ? (
        <div className="space-y-4">
          <VisionEmbodimentWalkthrough
            workbook={workbook}
            visionRecall={visionRecall}
            onVisionRecallChange={setVisionRecall}
          />
          {selectedStory ? (
            <div className={cn(lh.cardAmber, "p-4")}>
              <p className={cn(lh.labelUpper, "mb-2")}>Your story today</p>
              <p className={cn(lh.bodySm, "mb-0 italic")}>{selectedStory.text}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {step.kind === "story" && workbook ? (
        <MorningStoryPanel
          stories={workbook.stories}
          suggestedIndex={storySuggestedIndex}
          selectedIndex={storySelectedIndex}
          onSelectedIndexChange={onStorySelectedIndexChange}
          onAddStory={onAddStory}
          storyRecall={storyRecall}
          onStoryRecallChange={setStoryRecall}
        />
      ) : null}

      {step.kind === "surrender" ? (
        <div className="space-y-3">
          <p className={cn(lh.bodySm, "leading-relaxed")}>{SURRENDER_STEP_INTRO}</p>
          <MorningPrayerReader title="Surrender" value={surrender} onChange={setSurrender} />
        </div>
      ) : null}

      {step.kind === "covering" ? (
        <div className="space-y-3">
          <p className={cn(lh.bodySm, "leading-relaxed")}>{COVERING_STEP_INTRO}</p>
          <ul className={cn("space-y-1 mb-2 text-[13px] list-disc pl-4", lh.muted)}>
            {COVERING_PRAYER_PROMPTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <MorningPrayerReader title="Covering" value={covering} onChange={setCovering} />
        </div>
      ) : null}

      {step.kind === "assignment" ? (
        <div className="space-y-4">
          {DAILY_ASSIGNMENT_FIELDS.map((field) => (
            <div key={field.key}>
              <label className={cn(lh.label, "mb-1 block")}>{field.label}</label>
              <Input
                value={dailyAssignment[field.key]}
                onChange={(e) => setDailyAssignment({ [field.key]: e.target.value })}
                className={lh.input}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      ) : null}

      {step.kind === "goal" && currentGoal ? (
        <div className="space-y-3">
          <h2 className={cn(lh.titleMd, "mb-0")}>{currentGoal.title}</h2>
          <Textarea
            value={touches[currentGoal.id]?.vivid_recall ?? currentGoal.vivid_detail ?? ""}
            onChange={(e) => setTouch(currentGoal.id, { vivid_recall: e.target.value })}
            rows={3}
            className={lh.textarea}
            placeholder="See it vividly"
          />
          <Textarea
            value={touches[currentGoal.id]?.obedience_step ?? ""}
            onChange={(e) => setTouch(currentGoal.id, { obedience_step: e.target.value })}
            rows={2}
            className={lh.textarea}
            placeholder="One obedience step today"
          />
        </div>
      ) : null}

      {step.kind === "metrics" && workbook ? (
        <div>
          {workbook.metrics.map((m) => (
            <div key={m.id} className="flex items-center gap-2 mb-3">
              <span className={cn("text-[13px] w-36 shrink-0 truncate", lh.muted)}>{m.label}</span>
              <Input
                value={metricValues[m.id] ?? ""}
                onChange={(e) => setMetricValues((v) => ({ ...v, [m.id]: e.target.value }))}
                className={cn(lh.input, "flex-1")}
              />
            </div>
          ))}
        </div>
      ) : null}

    </div>
  );
}
