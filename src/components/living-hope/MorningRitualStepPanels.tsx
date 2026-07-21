import { Link } from "react-router-dom";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MORNING_FORMULA_INTRO_FLOW,
  SCRIPTURE_QUESTIONS,
  SURRENDER_PRAYER_PROMPTS,
  SURRENDER_STEP_INTRO,
  WORSHIP_PROMPTS,
  type DailyAssignment,
  type RitualStep,
} from "@/lib/livingHope/morningRitual";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import type { LivingHopeWorkbookContent, WorshipMusicHistoryItem } from "@/lib/livingHope/workbookTypes";
import { morningFormulaReaderState, persistReaderReturn } from "@/lib/bible/readerNavigation";
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
  expressMode,
  onExpressModeChange,
  guidedMode = false,
  onGuidedModeChange,
  durationMin,
  onDurationChange,
}: Props) {
  if (step.kind === "intro") {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="min-w-0">
          <h1 className={cn(lh.titleLg, "mb-3")}>Morning formula</h1>
          <p className={cn(lh.body, "mb-4")}>{MORNING_FORMULA_INTRO_FLOW}.</p>
          {durationMin != null && onDurationChange ? (
            <div className="mb-4">
              <MorningFormulaDurationPicker durationMin={durationMin} onDurationChange={onDurationChange} />
            </div>
          ) : null}
          <p className={cn("text-[13px] mb-4", lh.muted)}>
            Shift from &ldquo;What do I need to do?&rdquo; to &ldquo;Who am I with?&rdquo; — then receive today&apos;s
            direction.
          </p>
          {(letter?.full_letter ?? letter?.outlook) ? (
            <blockquote className={lh.quote}>{(letter.full_letter ?? letter.outlook ?? "").slice(0, 320)}…</blockquote>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onGuidedModeChange?.(true)}
          className={cn(
            "rounded-xl border px-4 py-3 text-left transition-colors w-full",
            "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15",
          )}
        >
          <p className="text-[14px] font-semibold text-foreground">Guided morning</p>
          <p className="text-[13px] text-muted-foreground mt-1 leading-snug">
            Coach-led flow — worship music, gratitude journal, scripture timer, prayer help, and embodied vision.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onExpressModeChange(!expressMode)}
          className={cn(
            "rounded-xl border px-4 py-3 text-left transition-colors",
            expressMode
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border/60 bg-muted/25 hover:bg-muted/40",
          )}
        >
          <p className="text-[14px] font-semibold text-foreground">Express mode</p>
          <p className="text-[13px] text-muted-foreground mt-1 leading-snug">
            {expressMode
              ? "On — worship, thanks, scripture, pray, and today&apos;s assignment only."
              : "Off — full alignment with vision, surrender, goals, and metrics."}
          </p>
        </button>
        {!guidedMode ? (
          <p className={cn(lh.footnote, "px-1")}>
            Structured view — step-by-step panels with full navigation. Switch to guided anytime from the header.
          </p>
        ) : null}
        <div className="min-w-0">
          <img
            src="/images/morning-formula-steps.png"
            alt="He leads. We follow. His will. Our mission — worship, thank, read, pray, align, surrender, cover, assign, execute."
            className="mx-auto w-full max-w-[380px] rounded-xl border border-border/50 shadow-sm"
          />
        </div>
      </div>
    );
  }

  if (step.kind === "worship") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Worship</h1>
        <p className={cn(lh.bodySm, "mb-4")}>
          Put on praise music and pray. Get your eyes off business, money, systems, and pressure — talk to Him.
          You don&apos;t need to write anything down.
        </p>
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
        <h1 className={cn(lh.titleLg, "mb-3")}>Thanksgiving</h1>
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
    const readerState = morningFormulaReaderState({
      prompt: scripture?.prompt,
      reason: scripture?.reason,
    });

    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Scripture</h1>
        <p className={cn(lh.bodySm, "mb-4")}>
          {scripture?.source === "reading-plan"
            ? "Continue your reading plan — read slowly and let the text speak first."
            : "Read slowly. Let the text speak first."}
        </p>
        {scriptureBusy && !scripture ? (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading today&apos;s passage…</span>
          </div>
        ) : scripture ? (
          <div className="space-y-3 mb-4">
            {scripture.source === "reading-plan" ? (
              <span className={cn(lh.pillActive, "inline-flex mb-1")}>Reading plan</span>
            ) : (
              <span className="inline-flex mb-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                Today&apos;s passage
              </span>
            )}
            <h2 className="text-[17px] font-semibold">{scripture.reference}</h2>
            {scripture.planDayLabel && scripture.source === "reading-plan" ? (
              <p className={cn("text-[14px] font-medium", lh.accentMuted)}>{scripture.planDayLabel}</p>
            ) : null}
            {scripture.passage ? (
              <blockquote className="border-l-2 border-amber-400/70 pl-3 italic text-[14px] leading-relaxed whitespace-pre-wrap">
                {scripture.passage}
              </blockquote>
            ) : scripture.source === "reading-plan" ? (
              <p className={cn(lh.bodySm, "rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5")}>
                Open the Bible to read {scripture.planDayLabel ?? scripture.reference} for today&apos;s plan.
              </p>
            ) : null}
            {scripture.reason ? (
              <p className={cn("text-[13px]", lh.muted)}>
                <span className="font-medium text-foreground">
                  {scripture.source === "reading-plan" ? "Your plan: " : "Why this, today: "}
                </span>
                {scripture.reason}
              </p>
            ) : null}
            <PromptList items={SCRIPTURE_QUESTIONS} />
            {scripture.prompt ? (
              <p className={cn("text-[13px]", lh.bodySm)}>
                <span className="font-medium">Reflection: </span>
                {scripture.prompt}
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="mt-1" asChild>
              <Link
                to={scripture.readerHref}
                state={readerState}
                onClick={() => persistReaderReturn(readerState)}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Read in Bible
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center mb-4">
            <p className={cn("text-[13px] mb-3", lh.muted)}>
              No reading plan in progress — we&apos;ll pick a passage for today.
            </p>
            <Button variant="outline" size="sm" onClick={onGenerateScripture} disabled={scriptureBusy}>
              {scriptureBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get today's passage"}
            </Button>
          </div>
        )}
        {scriptureError ? <p className="text-[12px] text-destructive mb-2">{scriptureError}</p> : null}
        <label className={cn(lh.label, "mb-1 block")}>What stood out? (optional)</label>
        <Textarea
          value={scriptureReflection}
          onChange={(e) => setScriptureReflection(e.target.value)}
          rows={3}
          className={lh.textarea}
          placeholder="What does this teach me about God?"
        />
      </>
    );
  }

  if (step.kind === "prayer") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Conversation</h1>
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
        <h1 className={cn(lh.titleLg, "mb-4")}>Manifesto</h1>
        <p className={cn(lh.bodyQuote, "mb-0")}>{manifestoItem.text}</p>
        <p className={cn("text-[13px] mt-6", lh.muted)}>Speak it slowly. Let it land.</p>
      </>
    );
  }

  if (step.kind === "vision" && workbook) {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-2")}>Vision</h1>
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
        <h1 className={cn(lh.titleLg, "mb-2")}>Story</h1>
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
        <h1 className={cn(lh.titleLg, "mb-3")}>Today&apos;s assignment</h1>
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
        <h1 className={cn(lh.titleLg, "mb-2")}>{currentGoal.title}</h1>
        <p className={cn(lh.footnote, "mb-4")}>
          Long-term aim — one vivid picture and one obedience step for this goal today.
        </p>
        {currentGoal.target_metric ? (
          <p className={cn("text-[13px] mb-4", lh.muted)}>Target: {currentGoal.target_metric}</p>
        ) : null}
        <label className={cn(lh.label, "mb-1 block")}>See it vividly</label>
        <Textarea
          value={touches[currentGoal.id]?.vivid_recall ?? currentGoal.vivid_detail ?? ""}
          onChange={(e) => setTouch(currentGoal.id, { vivid_recall: e.target.value })}
          rows={4}
          className={cn(lh.textarea, "mb-4")}
        />
        <label className={cn(lh.label, "mb-1 block")}>One obedience step today</label>
        <Textarea
          value={touches[currentGoal.id]?.obedience_step ?? ""}
          onChange={(e) => setTouch(currentGoal.id, { obedience_step: e.target.value })}
          rows={2}
          className={lh.textarea}
        />
      </>
    );
  }

  if (step.kind === "metrics" && workbook) {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-4")}>Metrics</h1>
        {workbook.metrics.map((m) => (
          <div key={m.id} className="flex items-center gap-2 mb-3">
            <span className={cn("text-[13px] w-36 shrink-0 truncate", lh.muted)}>{m.label}</span>
            <Input
              value={metricValues[m.id] ?? ""}
              onChange={(e) => setMetricValues((v) => ({ ...v, [m.id]: e.target.value }))}
              className={cn(lh.input, "flex-1")}
              placeholder={m.unit ?? "today"}
            />
          </div>
        ))}
      </>
    );
  }

  if (step.kind === "surrender") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-2")}>Surrender</h1>
        <p className={cn(lh.bodySm, "mb-3 leading-relaxed")}>{SURRENDER_STEP_INTRO}</p>
        <PromptList items={SURRENDER_PRAYER_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>Prayer of release</label>
        <Textarea
          value={surrender}
          onChange={(e) => setSurrender(e.target.value)}
          rows={18}
          className={lh.textarea}
          aria-label="Surrender prayer"
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
        <h1 className={cn(lh.titleLg, "mb-2")}>Covering</h1>
        <p className={cn(lh.bodySm, "mb-3 leading-relaxed")}>{COVERING_STEP_INTRO}</p>
        <p className={cn(lh.labelUpper, lh.accent, "mb-3")}>Pray aloud</p>
        <PromptList items={COVERING_PRAYER_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>Blood, warfare &amp; angels</label>
        <Textarea
          value={covering}
          onChange={(e) => setCovering(e.target.value)}
          rows={20}
          className={lh.textarea}
          aria-label="Covering prayer"
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
        <h1 className={cn(lh.titleLg, "mb-2")}>Work as worship</h1>
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
