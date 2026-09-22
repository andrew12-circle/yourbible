import { MorningWorshipMusic } from "./MorningWorshipMusic";
import { MorningScriptureReading } from "./MorningScriptureReading";
import { MorningPrayerReader } from "./MorningPrayerReader";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { TodayAssignmentPanel } from "@/components/living-hope/TodayAssignmentPanel";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { MorningScripture } from "@/hooks/useMorningScripture";
import {
  COVERING_PRAYER_PROMPTS,
  COVERING_STEP_INTRO,
} from "@/lib/livingHope/coveringPrayer";
import {
  ASSIGNMENT_VS_GOALS_HINT,
  DAILY_ASSIGNMENT_FIELDS,
  dailyAssignmentDisplayLabel,
  dailyAssignmentHasContent,
  SURRENDER_PRAYER_PROMPTS,
  SURRENDER_STEP_INTRO,
  WORSHIP_PROMPTS,
  type DailyAssignment,
  type RitualStep,
} from "@/lib/livingHope/morningRitual";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import type { LivingHopeWorkbookContent, WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import { ThanksgivingListsInput } from "@/components/living-hope/ThanksgivingListsInput";
import { MorningConversationPanel } from "@/components/living-hope/MorningConversationPanel";
import { MorningFormulaInlineJournal } from "@/components/living-hope/MorningFormulaInlineJournal";
import { MORNING_FORMULA_WORSHIP_RETURN } from "@/lib/bible/readerNavigation";
import { VisionEmbodimentWalkthrough } from "@/components/living-hope/VisionEmbodimentWalkthrough";
import { MorningStoryPanel } from "@/components/living-hope/MorningStoryPanel";
import { MorningFormulaDurationPicker } from "@/components/living-hope/MorningFormulaSessionTimer";
import type { SessionDurationMin } from "@/lib/livingHope/morningFormulaTimer";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

function PromptList({ items }: { items: readonly string[] }) {
  return (
    <ul className={cn("space-y-1 mb-4 text-[13px] list-disc pl-4", lh.muted)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

type Props = {
  step: RitualStep;
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
  expressMode: boolean;
  onExpressModeChange: (next: boolean) => void;
  guidedMode?: boolean;
  onGuidedModeChange?: (next: boolean) => void;
  durationMin?: SessionDurationMin;
  onDurationChange?: (next: SessionDurationMin) => void;
  prayerRecordings: { surrender?: string; covering?: string };
  onPrayerRecordingChange: (key: "surrender" | "covering", path: string) => void;
};

export function MorningRitualStepPanels({
  step,
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
  journalEntryId,
  worshipPlaylistUrl,
  worshipPlaylistHistory,
  onWorshipMusicChange,
  durationMin,
  onDurationChange,
  prayerRecordings,
  onPrayerRecordingChange,
}: Props) {
  if (step.kind === "intro") {
    return <div className="space-y-6">
      <p className={lh.body}>Settle in. This morning is time to worship, reflect, and choose your next faithful step.</p>
      {durationMin != null && onDurationChange && <MorningFormulaDurationPicker durationMin={durationMin} onDurationChange={onDurationChange} />}
      {(letter?.full_letter ?? letter?.outlook) && <details><summary className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground">A reminder from your foundation</summary><blockquote className={lh.quote}>{letter?.full_letter ?? letter?.outlook}</blockquote></details>}
    </div>;
  }

  if (step.kind === "worship") {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-4")}>
          Put on praise music and pray. Get your eyes off business, money, systems, and pressure — talk to Him.
          You don&apos;t need to write anything down.
        </p>
        <MorningWorshipMusic url={worshipPlaylistUrl} history={worshipPlaylistHistory} onChange={onWorshipMusicChange} />
        <p className={cn(lh.labelUpper, "mb-2 mt-1")}>Focus on</p>
        <PromptList items={WORSHIP_PROMPTS} />
        <MorningFormulaInlineJournal
          entryId={conversationEntryId}
          busy={conversationBusy}
          error={conversationError}
          section="worship"
          returnTo={MORNING_FORMULA_WORSHIP_RETURN}
          className="mt-2"
        />
      </>
    );
  }

  if (step.kind === "thanksgiving") {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-2")}>
          Ten thanks — five for what is, five for what is coming. Name them specifically.
        </p>
        <p className={cn(lh.footnote, "mb-4")}>
          These build today&apos;s entry as you go — you&apos;ll add more in conversation later.
        </p>
        <ThanksgivingListsInput
          thanksgivingNow={thanksgivingNow}
          thanksgivingNotYet={thanksgivingNotYet}
          onThanksgivingNowChange={onThanksgivingNowChange}
          onThanksgivingNotYetChange={onThanksgivingNotYetChange}
        />
      </>
    );
  }

  if (step.kind === "scripture") {
    return <MorningScriptureReading scripture={scripture} busy={scriptureBusy} error={scriptureError}
      onRetry={onGenerateScripture} reflection={scriptureReflection} onReflectionChange={setScriptureReflection} />;
  }

  if (step.kind === "prayer") {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-4")}>
          Relationship, not instructions — get it out honestly, then ask and listen.
        </p>
        <MorningConversationPanel
          entryId={conversationEntryId}
          preview={conversationPreview}
          busy={conversationBusy}
          error={conversationError}
        />
      </>
    );
  }

  if (step.kind === "manifesto" && manifestoItem) {
    return (
      <>
        <p className={cn(lh.bodyQuote, "mb-0")}>{manifestoItem.text}</p>
        <p className={cn("text-[13px] mt-6", lh.muted)}>Speak it slowly. Let it land.</p>
      </>
    );
  }

  if (step.kind === "vision" && workbook) {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-4")}>
          Don&apos;t read the numbers — inhabit the life. Present tense. You already have it.
        </p>
        <VisionEmbodimentWalkthrough
          workbook={workbook}
          visionRecall={visionRecall}
          onVisionRecallChange={setVisionRecall}
        />
      </>
    );
  }

  if (step.kind === "story" && workbook) {
    return (
      <>
        <MorningStoryPanel
          stories={workbook.stories}
          suggestedIndex={storySuggestedIndex}
          selectedIndex={storySelectedIndex}
          onSelectedIndexChange={onStorySelectedIndexChange}
          onAddStory={onAddStory}
          storyRecall={storyRecall}
          onStoryRecallChange={setStoryRecall}
        />
      </>
    );
  }

  if (step.kind === "assignment") {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-2")}>
          Not destiny or the five-year plan — just: what does God want you to do today?
        </p>
        <p className={cn(lh.footnote, "mb-4")}>{ASSIGNMENT_VS_GOALS_HINT}</p>
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
      </>
    );
  }

  if (step.kind === "goal" && currentGoal) {
    return (
      <>
        <p className={cn(lh.labelUpper, "mb-1 capitalize", lh.accentMuted)}>{currentGoal.domain}</p>
        <p className={cn(lh.footnote, "mb-4")}>
          Long-term aim — one vivid picture and one obedience step for this goal today.
        </p>
        {currentGoal.target_metric ? (
          <p className={cn("text-[13px] mb-4", lh.muted)}>Target: {currentGoal.target_metric}</p>
        ) : null}
        <label className={cn(lh.label, "mb-1 block")}>See it vividly</label>
        <MorningVoiceField
          value={touches[currentGoal.id]?.vivid_recall ?? currentGoal.vivid_detail ?? ""}
          onChange={(value) => setTouch(currentGoal.id, { vivid_recall: value })}
          multiline rows={4} label="See it vividly" className="mb-4"
        />
        <label className={cn(lh.label, "mb-1 block")}>One obedience step today</label>
        <MorningVoiceField
          value={touches[currentGoal.id]?.obedience_step ?? ""}
          onChange={(value) => setTouch(currentGoal.id, { obedience_step: value })}
          multiline rows={2} label="One obedience step today"
        />
      </>
    );
  }

  if (step.kind === "metrics" && workbook) {
    return (
      <>
        {workbook.metrics.map((m) => (
          <div key={m.id} className="flex items-center gap-2 mb-3">
            <span className={cn("text-[13px] w-36 shrink-0 truncate", lh.muted)}>{m.label}</span>
            <MorningVoiceField
              value={metricValues[m.id] ?? ""}
              onChange={(value) => setMetricValues((v) => ({ ...v, [m.id]: value }))}
              label={m.label}
              placeholder={m.unit ?? "today"}
              className="flex-1"
            />
          </div>
        ))}
      </>
    );
  }

  if (step.kind === "surrender") {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-3 leading-relaxed")}>{SURRENDER_STEP_INTRO}</p>
        <PromptList items={SURRENDER_PRAYER_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>Prayer of release</label>
        <MorningPrayerReader
          title="Surrender"
          value={surrender}
          onChange={setSurrender}
          prayerKey="surrender"
          recordingPath={prayerRecordings.surrender}
          onRecordingPathChange={(path) => onPrayerRecordingChange("surrender", path)}
        />
        <p className={cn(lh.footnote, "mt-3 italic")}>
          Speak it slowly. When you finish, let your shoulders drop. Then continue.
        </p>
      </>
    );
  }

  if (step.kind === "covering") {
    return (
      <>
        <p className={cn(lh.bodySm, "mb-3 leading-relaxed")}>{COVERING_STEP_INTRO}</p>
        <p className={cn(lh.labelUpper, lh.accent, "mb-3")}>Pray aloud</p>
        <PromptList items={COVERING_PRAYER_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>Blood, warfare &amp; angels</label>
        <MorningPrayerReader
          title="Covering"
          value={covering}
          onChange={setCovering}
          prayerKey="covering"
          recordingPath={prayerRecordings.covering}
          onRecordingPathChange={(path) => onPrayerRecordingChange("covering", path)}
        />
        <p className={cn(lh.footnote, "mt-3 italic")}>
          Declare it with your voice. Command angels. Seal the day. Then continue.
        </p>
      </>
    );
  }

  if (step.kind === "done") {
    const hasAssignment = dailyAssignmentHasContent(dailyAssignment);
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className={lh.iconBoxLg}>
          <Check className="w-7 h-7 text-amber-600" />
        </div>
        <p className={cn("text-[14px] max-w-xs", lh.bodySm)}>
          Seek God → receive direction → build. Go execute what you wrote down.
        </p>
        {hasAssignment ? (
          <div className={cn("mt-4 text-left w-full max-w-xs rounded-lg border border-stone-200/80 p-3 text-[13px]", lh.bodySm)}>
            <p className={cn("font-semibold mb-2", lh.accentMuted)}>Today&apos;s assignment</p>
            {DAILY_ASSIGNMENT_FIELDS.map((field) =>
              dailyAssignment[field.key].trim() ? (
                <p key={field.key}>
                  <span className="font-medium">{dailyAssignmentDisplayLabel(field.key)}:</span>{" "}
                  {dailyAssignment[field.key]}
                </p>
              ) : null,
            )}
          </div>
        ) : null}
        <Link to="/life/todos" className={cn("mt-4 text-[13px] font-medium", lh.accentLink)}>
          Open tasks →
        </Link>
        <Link to="/life/habits" className={cn("mt-2 text-[13px] font-medium", lh.accentLink)}>
          Open habits →
        </Link>
        {journalEntryId ? (
          <Link to={`/journal/${journalEntryId}`} className={cn("mt-2 text-[13px]", lh.accentLink)}>
            Journal entry →
          </Link>
        ) : null}
        <Link to="/framework/graph" className={cn("mt-2 text-[13px]", lh.muted)}>
          View on mind map →
        </Link>
      </div>
    );
  }

  return null;
}
