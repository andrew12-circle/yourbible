import { MorningWorshipMusic } from "./MorningWorshipMusic";
import { MorningWorshipGuide } from "./MorningWorshipGuide";
import { MorningScriptureReading } from "./MorningScriptureReading";
import { MorningPrayerHelp } from "./MorningPrayerHelp";
import { MorningPrayerReader } from "./MorningPrayerReader";
import { useMemo } from "react";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { TodayAssignmentPanel } from "@/components/living-hope/TodayAssignmentPanel";
import { MorningGuidedCoach } from "@/components/living-hope/MorningGuidedCoach";
import { MorningFormulaDurationPicker } from "@/components/living-hope/MorningFormulaSessionTimer";
import { MorningConversationPanel } from "@/components/living-hope/MorningConversationPanel";
import { ThanksgivingListsInput } from "@/components/living-hope/ThanksgivingListsInput";
import { VisionEmbodimentWalkthrough } from "@/components/living-hope/VisionEmbodimentWalkthrough";
import { VisionActionBridge } from "@/components/living-hope/VisionActionBridge";
import type { MorningScripture } from "@/hooks/useMorningScripture";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import {
  COVERING_PRAYER_PROMPTS,
  COVERING_STEP_INTRO,
} from "@/lib/livingHope/coveringPrayer";
import {
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
  onUpdateStory: (index: number, patch: Partial<import("@/lib/livingHope/workbookTypes").WorkbookStory>) => void;
  onDeleteStory: (index: number) => void;
  storyRecall: string;
  setStoryRecall: (v: string) => void;
  currentGoal: LivingHopeGoalRow | null | undefined;
  goals: LivingHopeGoalRow[];
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
  prayerRecordings: { surrender?: string; covering?: string };
  onPrayerRecordingChange: (key: "surrender" | "covering", path: string) => void;
};

export function MorningGuidedExperience({
  step,
  formalName,
  letter,
  workbook,
  manifestoItem,
  storyRecall,
  setStoryRecall,
  currentGoal,
  goals,
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
  prayerRecordings,
  onPrayerRecordingChange,
}: Props) {
  const beat = guidedCoachBeatForStep(step);
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
        <VisionEmbodimentWalkthrough
          workbook={workbook}
          visionRecall={visionRecall}
          onVisionRecallChange={setVisionRecall}
        />
      ) : null}

      {step.kind === "story" ? (
        <VisionActionBridge
          visionRecall={visionRecall}
          value={storyRecall}
          onChange={setStoryRecall}
        />
      ) : null}

      {step.kind === "surrender" ? (
        <div className="space-y-3">
          <p className={cn(lh.bodySm, "leading-relaxed")}>{SURRENDER_STEP_INTRO}</p>
          <MorningPrayerReader
            title="Surrender"
            value={surrender}
            onChange={setSurrender}
            prayerKey="surrender"
            recordingPath={prayerRecordings.surrender}
            onRecordingPathChange={(path) => onPrayerRecordingChange("surrender", path)}
          />
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
          <MorningPrayerReader
            title="Covering"
            value={covering}
            onChange={setCovering}
            prayerKey="covering"
            recordingPath={prayerRecordings.covering}
            onRecordingPathChange={(path) => onPrayerRecordingChange("covering", path)}
          />
        </div>
      ) : null}

      {step.kind === "assignment" ? (
        <TodayAssignmentPanel
          assignment={dailyAssignment}
          onChange={setDailyAssignment}
          scriptureReflection={scriptureReflection}
          visionRecall={visionRecall}
          storyRecall={storyRecall}
          thanksgivingNow={thanksgivingNow}
          touches={touches}
          goals={goals}
        />
      ) : null}

      {step.kind === "goal" && currentGoal ? (
        <div className="space-y-3">
          <h2 className={cn(lh.titleMd, "mb-0")}>{currentGoal.title}</h2>
          <MorningVoiceField
            value={touches[currentGoal.id]?.vivid_recall ?? currentGoal.vivid_detail ?? ""}
            onChange={(value) => setTouch(currentGoal.id, { vivid_recall: value })}
            multiline
            rows={3}
            label="See it vividly"
            placeholder="See it vividly"
          />
          <MorningVoiceField
            value={touches[currentGoal.id]?.obedience_step ?? ""}
            onChange={(value) => setTouch(currentGoal.id, { obedience_step: value })}
            multiline
            rows={2}
            label="One obedience step today"
            placeholder="One obedience step today"
          />
        </div>
      ) : null}

      {step.kind === "metrics" && workbook ? (
        <div>
          {workbook.metrics.map((m) => (
            <div key={m.id} className="flex items-center gap-2 mb-3">
              <span className={cn("text-[13px] w-36 shrink-0 truncate", lh.muted)}>{m.label}</span>
              <MorningVoiceField
                value={metricValues[m.id] ?? ""}
                onChange={(value) => setMetricValues((v) => ({ ...v, [m.id]: value }))}
                label={m.label}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      ) : null}

    </div>
  );
}
