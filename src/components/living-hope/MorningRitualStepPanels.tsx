import { Link } from "react-router-dom";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { MorningDailyReading } from "@/hooks/useMorningDailyReading";
import {
  PRAYER_PROMPTS,
  SCRIPTURE_QUESTIONS,
  THANKSGIVING_PROMPTS,
  WORSHIP_PROMPTS,
  type DailyAssignment,
  type RitualStep,
} from "@/lib/livingHope/morningRitual";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import { readerPath } from "@/lib/bible/reference";
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
  storyItem: { text: string } | null | undefined;
  currentGoal: LivingHopeGoalRow | null | undefined;
  touches: Record<string, GoalTouch>;
  setTouch: (goalId: string, patch: Partial<GoalTouch>) => void;
  visionRecall: string;
  setVisionRecall: (v: string) => void;
  metricValues: Record<string, string>;
  setMetricValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  worshipNote: string;
  setWorshipNote: (v: string) => void;
  thanksgivingNote: string;
  setThanksgivingNote: (v: string) => void;
  prayerNote: string;
  setPrayerNote: (v: string) => void;
  scriptureReflection: string;
  setScriptureReflection: (v: string) => void;
  dailyAssignment: DailyAssignment;
  setDailyAssignment: (patch: Partial<DailyAssignment>) => void;
  surrender: string;
  setSurrender: (v: string) => void;
  reading: MorningDailyReading | null;
  readingBusy: boolean;
  readingError: string | null;
  onGenerateReading: () => void;
  journalEntryId: string | null;
};

export function MorningRitualStepPanels({
  step,
  letter,
  workbook,
  manifestoItem,
  storyItem,
  currentGoal,
  touches,
  setTouch,
  visionRecall,
  setVisionRecall,
  metricValues,
  setMetricValues,
  worshipNote,
  setWorshipNote,
  thanksgivingNote,
  setThanksgivingNote,
  prayerNote,
  setPrayerNote,
  scriptureReflection,
  setScriptureReflection,
  dailyAssignment,
  setDailyAssignment,
  surrender,
  setSurrender,
  reading,
  readingBusy,
  readingError,
  onGenerateReading,
  journalEntryId,
}: Props) {
  if (step.kind === "intro") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Morning formula</h1>
        <p className={cn(lh.body, "mb-4")}>
          Worship → thank → read → pray → align → assign → surrender → execute.
        </p>
        <p className={cn("text-[13px] mb-4", lh.muted)}>
          Shift from &ldquo;What do I need to do?&rdquo; to &ldquo;Who am I with?&rdquo; — then receive today&apos;s
          direction.
        </p>
        {(letter?.full_letter ?? letter?.outlook) ? (
          <blockquote className={lh.quote}>{(letter.full_letter ?? letter.outlook ?? "").slice(0, 320)}…</blockquote>
        ) : null}
      </>
    );
  }

  if (step.kind === "worship") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Worship</h1>
        <p className={cn(lh.bodySm, "mb-3")}>
          Get your eyes off business, money, systems, and pressure. Focus on:
        </p>
        <PromptList items={WORSHIP_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>Who are you with this morning? (optional)</label>
        <Textarea
          value={worshipNote}
          onChange={(e) => setWorshipNote(e.target.value)}
          rows={4}
          className={lh.textarea}
          placeholder="Father, You are good… sovereign… faithful…"
        />
      </>
    );
  }

  if (step.kind === "thanksgiving") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Thanksgiving</h1>
        <p className={cn(lh.bodySm, "mb-3")}>Thank Him for specific mercies — break anxiety and scarcity thinking.</p>
        <PromptList items={THANKSGIVING_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>What are you thankful for?</label>
        <Textarea
          value={thanksgivingNote}
          onChange={(e) => setThanksgivingNote(e.target.value)}
          rows={5}
          className={lh.textarea}
          placeholder="Salvation… family… provision…"
        />
      </>
    );
  }

  if (step.kind === "scripture") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Scripture</h1>
        <p className={cn(lh.bodySm, "mb-4")}>Read slowly. Let the text speak first.</p>
        {readingBusy && !reading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading today&apos;s passage…</span>
          </div>
        ) : reading ? (
          <div className="space-y-3 mb-4">
            <h2 className="text-[17px] font-semibold">{reading.reference}</h2>
            <blockquote className="border-l-2 border-amber-400/70 pl-3 italic text-[14px] leading-relaxed whitespace-pre-wrap">
              {reading.passage}
            </blockquote>
            {reading.reason ? (
              <p className={cn("text-[13px]", lh.muted)}>
                <span className="font-medium text-foreground">Why this, today: </span>
                {reading.reason}
              </p>
            ) : null}
            <PromptList items={SCRIPTURE_QUESTIONS} />
            {reading.prompt ? (
              <p className={cn("text-[13px]", lh.bodySm)}>
                <span className="font-medium">Reflection: </span>
                {reading.prompt}
              </p>
            ) : null}
            <Button variant="outline" size="sm" className="mt-1" asChild>
              <Link
                to={readerPath(reading.reference)}
                state={{ dailyPrompt: reading.prompt, dailyReason: reading.reason }}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Read in Bible
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center mb-4">
            <p className={cn("text-[13px] mb-3", lh.muted)}>No reading yet for today.</p>
            <Button variant="outline" size="sm" onClick={onGenerateReading} disabled={readingBusy}>
              {readingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate today's passage"}
            </Button>
          </div>
        )}
        {readingError ? <p className="text-[12px] text-destructive mb-2">{readingError}</p> : null}
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
        <p className={cn(lh.bodySm, "mb-3")}>Talk honestly — relationship, not just instructions. Then pause and listen.</p>
        <PromptList items={PRAYER_PROMPTS} />
        <label className={cn(lh.label, "mb-1 block")}>Prayer</label>
        <Textarea
          value={prayerNote}
          onChange={(e) => setPrayerNote(e.target.value)}
          rows={6}
          className={lh.textarea}
          placeholder="Father, I bring…"
        />
        <p className={cn("text-[12px] mt-3 italic", lh.muted)}>Pause. Listen before you move on.</p>
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
        <h1 className={cn(lh.titleLg, "mb-3")}>Vision</h1>
        {workbook.vision_headline ? (
          <p className="text-[15px] text-stone-700 mb-4">{workbook.vision_headline}</p>
        ) : null}
        <ul className={cn("space-y-1 mb-4 text-[13px]", lh.muted)}>
          {workbook.income_lines.map((l) => (
            <li key={l.id}>
              {l.label}: <span className={lh.accentMuted}>{l.amount}</span>
            </li>
          ))}
        </ul>
        {workbook.income_total_label ? (
          <p className={cn("text-[14px] font-medium mb-4", lh.accent)}>{workbook.income_total_label}</p>
        ) : null}
        <label className={cn(lh.label, "mb-1 block")}>See it vividly — present tense</label>
        <Textarea
          value={visionRecall}
          onChange={(e) => setVisionRecall(e.target.value)}
          rows={5}
          className={lh.textarea}
          placeholder="I walk into the office knowing revenue is automated…"
        />
      </>
    );
  }

  if (step.kind === "story" && storyItem) {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-4")}>Story</h1>
        <p className={lh.bodyLg}>{storyItem.text}</p>
        <p className={cn("text-[13px] mt-6", lh.muted)}>Picture it. Feel it. Thank God before you see it.</p>
      </>
    );
  }

  if (step.kind === "assignment") {
    return (
      <>
        <h1 className={cn(lh.titleLg, "mb-3")}>Today&apos;s assignment</h1>
        <p className={cn(lh.bodySm, "mb-4")}>
          Not destiny or the five-year plan — just: what does God want you to do today?
        </p>
        <div className="space-y-4">
          <div>
            <label className={cn(lh.label, "mb-1 block")}>Top 1 spiritual priority</label>
            <Input
              value={dailyAssignment.spiritual}
              onChange={(e) => setDailyAssignment({ spiritual: e.target.value })}
              className={lh.input}
              placeholder="e.g. Read James 1 at lunch"
            />
          </div>
          <div>
            <label className={cn(lh.label, "mb-1 block")}>Top 1 family priority</label>
            <Input
              value={dailyAssignment.family}
              onChange={(e) => setDailyAssignment({ family: e.target.value })}
              className={lh.input}
              placeholder="e.g. Finish Caroline's closet"
            />
          </div>
          <div>
            <label className={cn(lh.label, "mb-1 block")}>Top 1 business priority</label>
            <Input
              value={dailyAssignment.business}
              onChange={(e) => setDailyAssignment({ business: e.target.value })}
              className={lh.input}
              placeholder="e.g. Fix the system outage"
            />
          </div>
        </div>
      </>
    );
  }

  if (step.kind === "goal" && currentGoal) {
    return (
      <>
        <p className={cn(lh.labelUpper, "mb-1 capitalize", lh.accentMuted)}>{currentGoal.domain}</p>
        <h1 className={cn(lh.titleLg, "mb-4")}>{currentGoal.title}</h1>
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
        <h1 className={cn(lh.titleLg, "mb-3")}>Surrender</h1>
        <p className={cn("text-[14px] mb-4", lh.bodySm)}>Release control. Not my will, but Yours.</p>
        <Textarea value={surrender} onChange={(e) => setSurrender(e.target.value)} rows={6} className={lh.textarea} />
      </>
    );
  }

  if (step.kind === "done") {
    const hasAssignment =
      dailyAssignment.spiritual.trim() || dailyAssignment.family.trim() || dailyAssignment.business.trim();
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
            {dailyAssignment.spiritual.trim() ? (
              <p>
                <span className="font-medium">Spiritual:</span> {dailyAssignment.spiritual}
              </p>
            ) : null}
            {dailyAssignment.family.trim() ? (
              <p>
                <span className="font-medium">Family:</span> {dailyAssignment.family}
              </p>
            ) : null}
            {dailyAssignment.business.trim() ? (
              <p>
                <span className="font-medium">Business:</span> {dailyAssignment.business}
              </p>
            ) : null}
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
            Open journal entry →
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
