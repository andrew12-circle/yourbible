import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Mail,
  Settings2,
  Sparkles,
  Sunrise,
  Target,
} from "lucide-react";
import type { LivingHopeGoalRow, LivingHopeLetterRow, LivingHopeReviewRow } from "@/lib/livingHope/api";
import { findMorningReviewJournalEntry } from "@/lib/livingHope/morningReviewJournal";
import { getMorningFormulaEntryTarget } from "@/lib/livingHope/morningFormulaEntry";
import { getMorningRitualDraftSummary } from "@/lib/livingHope/morningRitualDraft";
import { localDateISO } from "@/lib/lifePriorities";
import { useAuth } from "@/contexts/AuthContext";
import { formatUnlockLabel, isLetterUnlockable } from "@/lib/livingHope/letterSections";
import { lh } from "@/lib/livingHope/themeClasses";
import {
  getPhaseProgress,
  getTodayPreview,
  getWorkbookReadiness,
  isSectionComplete,
} from "@/lib/livingHope/workbookProgress";
import {
  WORKBOOK_PHASES,
  WORKBOOK_SECTIONS,
  type LivingHopeWorkbookContent,
  type WorkbookPhase,
} from "@/lib/livingHope/workbookTypes";
import { IosGroupedRow, IosGroupedSection } from "@/components/living-hope/IosGroupedSection";

type Props = {
  workbook: LivingHopeWorkbookContent | null;
  letter: LivingHopeLetterRow | null;
  goals: LivingHopeGoalRow[];
  todayReview: LivingHopeReviewRow | null;
  streak: number;
  greeting: string;
};

export function MorningFormulaHub({ workbook, letter, goals, todayReview, streak, greeting }: Props) {
  const { user } = useAuth();
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookupError, setLookupError] = useState(false);
  const [journalLookup, setJournalLookup] = useState<{ owner: string; date: string; id: string } | null>(null);
  const journalEntryId = journalLookup?.owner === user?.id && journalLookup?.date === (todayReview?.review_date ?? localDateISO()) ? journalLookup.id : null;
  const reviewedToday = !!todayReview;
  const letterStatus = letter?.status ?? "draft";
  const canOpen = letter?.unlock_at && isLetterUnlockable(letter.unlock_at);
  const isSunday = new Date().getDay() === 0;

  const { percent, ritualReady, nextStep } = getWorkbookReadiness(workbook, goals, letter);
  const preview = workbook ? getTodayPreview(workbook) : null;
  const draftSummary = useMemo(() => getMorningRitualDraftSummary(user?.id), [user?.id]);
  const entry = useMemo(
    () =>
      getMorningFormulaEntryTarget({
        ritualReady,
        reviewedToday,
        draft: draftSummary,
      }),
    [ritualReady, reviewedToday, draftSummary],
  );

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    let active = true;
    setJournalLookup(null); setLookupError(false);
    if (user?.id && reviewedToday) {
      void findMorningReviewJournalEntry(user.id, todayReview?.review_date ?? localDateISO()).then((id) => {
        if (active) { setJournalLookup(id ? { owner: user.id, date: todayReview?.review_date ?? localDateISO(), id } : null); setLookupError(!id); }
      }).catch(() => { if (active) setLookupError(true); });
    }
    return () => { active = false; };
  }, [user?.id, reviewedToday, todayReview?.review_date, lookupAttempt]);

  const letterDetail = (() => {
    if (letterStatus === "draft") return "Write your 2-year letter";
    if (letterStatus === "sealed" && !canOpen) return `Sealed until ${formatUnlockLabel(letter?.unlock_at ?? null)}`;
    if (letterStatus === "sealed" && canOpen) return "Ready to open";
    return "Opened — review each morning";
  })();

  const renderPhaseSection = (phaseKey: WorkbookPhase) => {
    const phase = WORKBOOK_PHASES.find((p) => p.key === phaseKey);
    if (!phase) return null;

    const prog = workbook
      ? getPhaseProgress(phase.key, workbook, letter)
      : { filled: 0, total: phase.key === "anchor" ? 3 : 0 };
    const sections = WORKBOOK_SECTIONS.filter((s) => s.phase === phase.key);

    return (
      <IosGroupedSection
        key={phase.key}
        title={`${phase.label} · ${prog.filled}/${prog.total}`}
        footer={`${phase.scripture} — ${phase.description}`}
        className="mb-0 h-full"
      >
        {phase.key === "anchor" ? (
          <IosGroupedRow
            to="/living-hope/letter"
            icon={Mail}
            label="Letter from the future"
            detail={letterDetail}
            done={letterStatus !== "draft"}
          />
        ) : null}
        {sections.map((s) => (
          <IosGroupedRow
            key={s.key}
            to={`/living-hope/workbook/${s.key}`}
            label={s.label}
            detail={s.hint}
            done={workbook ? isSectionComplete(workbook, s.key) : false}
          />
        ))}
        {phase.key === "see" && goals.length > 0 ? (
          <IosGroupedRow
            to="/living-hope/letter"
            icon={Target}
            label={`Fractal goals (${goals.length})`}
            detail={goals
              .slice(0, 2)
              .map((g) => g.title)
              .join(" · ")}
          />
        ) : null}
      </IosGroupedSection>
    );
  };

  const sideSections = (
    <>
      {reviewedToday && todayReview?.surrender_note ? (
        <IosGroupedSection title="Today's surrender" className="mb-0">
          <p className="px-4 py-3 text-[15px] text-muted-foreground italic leading-relaxed">
            &ldquo;{todayReview.surrender_note}&rdquo;
          </p>
          {(journalEntryId || reviewedToday) && (
            <>
              {journalEntryId ? (
                <IosGroupedRow to={`/journal/${journalEntryId}`} icon={BookOpen} label="Journal entry" />
              ) : null}
              <IosGroupedRow to="/framework/graph" icon={Target} label="Mind map" />
            </>
          )}
        </IosGroupedSection>
      ) : null}

      {!ritualReady && nextStep ? (
        <IosGroupedSection
          title="Get started"
          footer={`Foundation ${percent}% ready — build once, review every morning.`}
          className="mb-0"
        >
          <IosGroupedRow to={nextStep.href} icon={Sparkles} label={nextStep.label} detail="Next step" />
        </IosGroupedSection>
      ) : null}

      {isSunday ? (
        <IosGroupedSection title="This week" className="mb-0">
          <IosGroupedRow
            to="/living-hope/workbook/weekly"
            icon={Calendar}
            label="Weekly review"
            detail="Sunday questions — move the machine"
          />
        </IosGroupedSection>
      ) : null}

      {ritualReady && preview && (preview.manifesto || workbook?.vision_headline || preview.story) ? (
        <IosGroupedSection title="Today's preview" footer="Heb 11:1 · Thy will be done" className="mb-0">
          {preview.manifesto?.text ? (
            <IosGroupedRow
              to="/living-hope/workbook/manifesto"
              label="Manifesto"
              detail={preview.manifesto.text}
            />
          ) : null}
          {workbook?.vision_headline ? (
            <IosGroupedRow
              to="/living-hope/workbook/vision"
              label="Vision"
              detail={
                workbook.income_total_label
                  ? `${workbook.vision_headline} · ${workbook.income_total_label}`
                  : workbook.vision_headline
              }
            />
          ) : null}
          {preview.story?.text ? (
            <IosGroupedRow
              to="/living-hope/workbook/stories"
              label="Story"
              detail={preview.story.text}
            />
          ) : null}
        </IosGroupedSection>
      ) : null}
    </>
  );

  const resuming = !!draftSummary?.inProgress;
  const href = resuming ? entry.href : reviewedToday && journalEntryId ? `/journal/${journalEntryId}` : "/living-hope/review";
  const label = resuming ? `Resume at ${draftSummary.stepLabel}` : reviewedToday ? "Open today's journal" : "Begin my morning";

  return <div className="mx-auto w-full max-w-4xl py-6 sm:py-10">
    <header className="mb-8">
      <p className="mb-3 text-sm text-muted-foreground">{dateStr}</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Morning formula</h1>
      <p className="mt-3 text-lg text-muted-foreground">{greeting}. Take a moment. Begin with God.</p>
    </header>
    <section className={lh.heroCard} aria-label="Today's morning">
      <Sunrise className="mb-5 h-7 w-7 text-amber-700 dark:text-amber-300" aria-hidden />
      <h2 className="font-serif text-3xl leading-tight">{resuming ? "Pick up where you left off." : reviewedToday ? "Carry this morning with you." : "A little stillness. A clear next step."}</h2>
      <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">{reviewedToday && !resuming ? "Your reflections and priorities are together in today's journal." : "Worship, reflect, and make room for what matters today."}</p>
      <div className="mt-7 max-w-sm">
        {reviewedToday && !resuming && !journalEntryId ? <>
          <Button className={lh.btnPrimary} disabled={!lookupError} onClick={() => setLookupAttempt((n) => n + 1)}>{lookupError ? "Try opening today's journal again" : "Opening today's journal…"}</Button>
          {lookupError && <p role="alert" className="mt-2 text-sm text-destructive">Your completed journal could not be found. No new entry has been created.</p>}
        </> : <Button asChild className={lh.btnPrimary}><Link to={href}>{label}<ChevronRight className="ml-2 h-4 w-4" aria-hidden /></Link></Button>}
      </div>
      <div className="mt-3">
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/living-hope/builder"><Settings2 className="mr-2 h-4 w-4" aria-hidden />Edit Morning Formula</Link>
        </Button>
      </div>
      {streak > 0 && <p className="mt-4 text-sm text-muted-foreground">{streak} {streak === 1 ? "morning" : "mornings"} in a row</p>}
    </section>
    <details className="mt-8 border-t border-border/60 pt-2">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg py-3 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring">My foundation <span className="text-sm font-normal text-muted-foreground">{percent}% ready</span></summary>
      <p className="mb-5 text-sm text-muted-foreground">Build once. Return to it when you need to realign.</p>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{WORKBOOK_PHASES.map((phase) => renderPhaseSection(phase.key))}</div>
    </details>
    <details className="mt-2 border-t border-border/60 pt-2">
      <summary className="min-h-14 cursor-pointer rounded-lg py-4 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring">Reflections & supporting tools</summary>
      <div className="grid gap-5 md:grid-cols-2">{sideSections}</div>
    </details>
  </div>;
}
