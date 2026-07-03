import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, LayoutList, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MorningGuidedCoach } from "@/components/living-hope/MorningGuidedCoach";
import { MorningFormulaDurationPicker } from "@/components/living-hope/MorningFormulaSessionTimer";
import { MorningConversationPanel } from "@/components/living-hope/MorningConversationPanel";
import { MorningFormulaJournalLink } from "@/components/living-hope/MorningFormulaJournalLink";
import { MorningStoryPanel } from "@/components/living-hope/MorningStoryPanel";
import { ThanksgivingListsInput } from "@/components/living-hope/ThanksgivingListsInput";
import { VisionEmbodimentWalkthrough } from "@/components/living-hope/VisionEmbodimentWalkthrough";
import { WorshipMusicPlayer } from "@/components/living-hope/WorshipMusicPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { useMorningScriptureTimer } from "@/hooks/useMorningScriptureTimer";
import type { MorningScripture } from "@/hooks/useMorningScripture";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import {
  morningFormulaReaderState,
  MORNING_FORMULA_WORSHIP_RETURN,
  persistReaderReturn,
} from "@/lib/bible/readerNavigation";
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
  formatGuidedCountdown,
  formatGuidedElapsed,
  GUIDED_COACH_COPY,
  guidedCoachBeatForStep,
  worshipPhaseComplete,
} from "@/lib/livingHope/morningGuidedRitual";
import type { SessionDurationMin } from "@/lib/livingHope/morningFormulaTimer";
import { generateGuidedMorningPrayers } from "@/lib/livingHope/morningGuidedPrayer";
import { syncHeartToConversationEntry } from "@/lib/livingHope/morningConversationJournal";
import { supabase } from "@/integrations/supabase/client";
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
  ensureConversationEntry,
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
  onSwitchToStructured,
  canGoBack,
  onGoBack,
  onContinue,
  saving,
  isLastStep,
  stepBudgetMs,
  stepRemainingMs,
  stepExpired,
  durationMin,
  onDurationChange,
}: Props) {
  const { user } = useAuth();
  const beat = guidedCoachBeatForStep(step);
  const [worshipElapsedMs, setWorshipElapsedMs] = useState(0);
  const [prayerGenerating, setPrayerGenerating] = useState(false);
  const [generatedPrayers, setGeneratedPrayers] = useState<string | null>(null);
  const [prayerError, setPrayerError] = useState<string | null>(null);

  const showMusic = step.kind === "worship" || step.kind === "thanksgiving";
  const musicSubdued = step.kind === "thanksgiving";

  const scriptureTimer = useMorningScriptureTimer(
    step.kind === "scripture",
    step.kind === "scripture" ? stepBudgetMs : undefined,
  );

  useEffect(() => {
    if (step.kind !== "worship") {
      setWorshipElapsedMs(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setWorshipElapsedMs(Date.now() - started);
    }, 1000);
    return () => window.clearInterval(id);
  }, [step.kind]);

  const worshipTargetMs = step.kind === "worship" ? stepBudgetMs : 0;

  const selectedStory =
    storySelectedIndex != null && workbook?.stories[storySelectedIndex]
      ? workbook.stories[storySelectedIndex]
      : null;

  const introMessage = useMemo(() => buildGuidedIntroMessage(formalName), [formalName]);

  const handleGeneratePrayers = async () => {
    if (!user?.id || !conversationEntryId) return;
    setPrayerGenerating(true);
    setPrayerError(null);
    try {
      const { data } = await supabase
        .from("journal_entries")
        .select("body")
        .eq("id", conversationEntryId)
        .eq("user_id", user.id)
        .maybeSingle();
      const body = String(data?.body ?? "");
      const prayers = await generateGuidedMorningPrayers(user.id, body);
      setGeneratedPrayers(prayers);
    } catch (e) {
      setPrayerError(e instanceof Error ? e.message : "Couldn't generate prayers");
    } finally {
      setPrayerGenerating(false);
    }
  };

  const handleUseGeneratedPrayers = async () => {
    if (!user?.id || !conversationEntryId || !generatedPrayers?.trim()) return;
    try {
      await syncHeartToConversationEntry(user.id, conversationEntryId, generatedPrayers);
      setGeneratedPrayers(null);
    } catch (e) {
      setPrayerError(e instanceof Error ? e.message : "Couldn't save prayers");
    }
  };

  const continueLabel = (() => {
    if (isLastStep) return "Complete review";
    if (stepExpired) return "Continue — time's up";
    if (step.kind === "worship" && !worshipPhaseComplete(worshipElapsedMs, worshipTargetMs)) {
      return `Continue (${formatGuidedCountdown(worshipTargetMs - worshipElapsedMs)} left)`;
    }
    if (step.kind === "scripture" && !scriptureTimer.complete) {
      return `Keep reading (${formatGuidedCountdown(scriptureTimer.targetMs - scriptureTimer.elapsedMs)} left)`;
    }
    if (stepBudgetMs > 0) {
      return `Continue (${formatGuidedCountdown(stepRemainingMs)} left)`;
    }
    return "Continue";
  })();

  const continueDisabled =
    saving ||
    (step.kind === "scripture" &&
      !scriptureTimer.complete &&
      !stepExpired) ||
    (step.kind === "worship" &&
      !worshipPhaseComplete(worshipElapsedMs, worshipTargetMs) &&
      !stepExpired);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className={cn(lh.labelUpper, "mb-0")}>Guided morning</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(lh.btnGhost, "h-8 text-[12px] gap-1.5")}
          onClick={onSwitchToStructured}
        >
          <LayoutList className="h-3.5 w-3.5" aria-hidden />
          Structured view
        </Button>
      </div>

      {showMusic ? (
        <div
          className={cn(
            "transition-all duration-700",
            musicSubdued ? "opacity-55 scale-[0.98] origin-top pointer-events-auto" : "opacity-100",
          )}
        >
          <WorshipMusicPlayer
            playlistUrl={worshipPlaylistUrl}
            playlistHistory={worshipPlaylistHistory}
            onWorshipMusicChange={onWorshipMusicChange}
          />
          {step.kind === "worship" ? (
            <p className={cn(lh.footnote, "text-center mt-1 tabular-nums")}>
              {worshipPhaseComplete(worshipElapsedMs, worshipTargetMs)
                ? "Music time complete — continue when ready"
                : `${formatGuidedCountdown(worshipTargetMs - worshipElapsedMs)} of worship remaining`}
            </p>
          ) : null}
        </div>
      ) : null}

      {beat === "intro" ? (
        <MorningGuidedCoach>{introMessage}</MorningGuidedCoach>
      ) : beat && beat !== "done" && beat !== "worship_start" && GUIDED_COACH_COPY[beat] ? (
        <MorningGuidedCoach>{GUIDED_COACH_COPY[beat]}</MorningGuidedCoach>
      ) : beat === "worship_start" ? (
        <MorningGuidedCoach>
          Put on praise music and pray. Get your eyes off pressure — talk to Him. Change the track if you&apos;d
          like; stay until the step timer runs out.
        </MorningGuidedCoach>
      ) : null}

      {step.kind === "intro" ? (
        <MorningFormulaDurationPicker durationMin={durationMin} onDurationChange={onDurationChange} />
      ) : null}

      {step.kind === "intro" && (letter?.full_letter ?? letter?.outlook) ? (
        <blockquote className={lh.quote}>{(letter.full_letter ?? letter.outlook ?? "").slice(0, 280)}…</blockquote>
      ) : null}

      {step.kind === "thanksgiving" ? (
        <div className="space-y-4">
          <MorningFormulaJournalLink
            entryId={conversationEntryId}
            busy={conversationBusy}
            error={conversationError}
            onEnsureEntry={ensureConversationEntry}
            returnTo={MORNING_FORMULA_WORSHIP_RETURN}
            label="Open today's journal"
            continueLabel="Journal gratitude"
          />
          <ThanksgivingListsInput
            thanksgivingNow={thanksgivingNow}
            thanksgivingNotYet={thanksgivingNotYet}
            onThanksgivingNowChange={onThanksgivingNowChange}
            onThanksgivingNotYetChange={onThanksgivingNotYetChange}
          />
        </div>
      ) : null}

      {step.kind === "scripture" ? (
        <div className="space-y-3">
          {scriptureBusy && !scripture ? (
            <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading today&apos;s passage…</span>
            </div>
          ) : scripture ? (
            <>
              <h2 className="text-[17px] font-semibold">{scripture.reference}</h2>
              {scripture.passage ? (
                <blockquote className="border-l-2 border-amber-400/70 pl-3 italic text-[14px] leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {scripture.passage}
                </blockquote>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <Link
                  to={scripture.readerHref}
                  state={morningFormulaReaderState({ prompt: scripture.prompt, reason: scripture.reason })}
                  onClick={() =>
                    persistReaderReturn(
                      morningFormulaReaderState({ prompt: scripture.prompt, reason: scripture.reason }),
                    )
                  }
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Read in Bible
                </Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onGenerateScripture} disabled={scriptureBusy}>
              {scriptureBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get today's passage"}
            </Button>
          )}
          {scriptureError ? <p className="text-[12px] text-destructive">{scriptureError}</p> : null}
          <div className={lh.progress}>
            <div
              className={lh.progressFill}
              style={{ width: `${Math.round(scriptureTimer.progress * 100)}%` }}
            />
          </div>
          <p className={cn(lh.footnote, "tabular-nums")}>
            {scriptureTimer.complete
              ? "Reading complete — continue when ready"
              : `${formatGuidedElapsed(scriptureTimer.elapsedMs)} of ${formatGuidedElapsed(scriptureTimer.targetMs)}`}
          </p>
          <Textarea
            value={scriptureReflection}
            onChange={(e) => setScriptureReflection(e.target.value)}
            rows={2}
            className={lh.textarea}
            placeholder="What stood out? (optional)"
          />
        </div>
      ) : null}

      {step.kind === "prayer" ? (
        <div className="space-y-4">
          <div className={cn(lh.cardFlat, "p-4 space-y-3")}>
            <p className={cn(lh.bodySm, "mb-0")}>Do you need help generating prayers from your journal?</p>
            <Button
              type="button"
              variant="outline"
              className={cn(lh.btnSecondary, "h-10")}
              disabled={prayerGenerating || !conversationEntryId}
              onClick={() => void handleGeneratePrayers()}
            >
              {prayerGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate prayers
                </>
              )}
            </Button>
            {prayerError ? <p className="text-[12px] text-destructive">{prayerError}</p> : null}
            {generatedPrayers ? (
              <div className="space-y-2">
                <Textarea value={generatedPrayers} readOnly rows={8} className={cn(lh.textarea, "text-[13px]")} />
                <Button type="button" size="sm" className={lh.btnSecondary} onClick={() => void handleUseGeneratedPrayers()}>
                  Add to journal
                </Button>
              </div>
            ) : null}
          </div>
          <MorningConversationPanel
            entryId={conversationEntryId}
            preview={conversationPreview}
            busy={conversationBusy}
            error={conversationError}
          />
        </div>
      ) : null}

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
          <Textarea
            value={surrender}
            onChange={(e) => setSurrender(e.target.value)}
            rows={14}
            className={lh.textarea}
            aria-label="Surrender prayer"
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
          <Textarea
            value={covering}
            onChange={(e) => setCovering(e.target.value)}
            rows={14}
            className={lh.textarea}
            aria-label="Covering prayer"
          />
        </div>
      ) : null}

      {step.kind === "assignment" ? (
        <div className="space-y-4">
          <div>
            <label className={cn(lh.label, "mb-1 block")}>Top 1 spiritual priority</label>
            <Input
              value={dailyAssignment.spiritual}
              onChange={(e) => setDailyAssignment({ spiritual: e.target.value })}
              className={lh.input}
            />
          </div>
          <div>
            <label className={cn(lh.label, "mb-1 block")}>Top 1 family priority</label>
            <Input
              value={dailyAssignment.family}
              onChange={(e) => setDailyAssignment({ family: e.target.value })}
              className={lh.input}
            />
          </div>
          <div>
            <label className={cn(lh.label, "mb-1 block")}>Top 1 business priority</label>
            <Input
              value={dailyAssignment.business}
              onChange={(e) => setDailyAssignment({ business: e.target.value })}
              className={lh.input}
            />
          </div>
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

      {step.kind === "done" ? (
        <MorningGuidedCoach>Work as worship — go execute what you wrote down.</MorningGuidedCoach>
      ) : null}

      {step.kind !== "done" ? (
        <div className="mt-auto pt-2 flex gap-2">
          {canGoBack ? (
            <Button
              type="button"
              variant="outline"
              className={cn(lh.btnSecondary, "h-12 px-4 shrink-0")}
              disabled={saving}
              onClick={onGoBack}
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              Back
            </Button>
          ) : null}
          <Button
            className={cn(lh.btnPrimary, canGoBack ? "flex-1" : "w-full")}
            disabled={continueDisabled}
            onClick={onContinue}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {continueLabel}
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      ) : null}

      {step.kind === "done" && journalEntryId ? (
        <Link to={`/journal/${journalEntryId}`} className={cn(lh.accentLink, "text-center text-[13px]")}>
          Open journal entry →
        </Link>
      ) : null}
    </div>
  );
}
