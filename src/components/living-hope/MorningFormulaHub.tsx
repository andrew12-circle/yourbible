import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Mail,
  Sparkles,
  Sunrise,
  Target,
} from "lucide-react";
import type { LivingHopeGoalRow, LivingHopeLetterRow, LivingHopeReviewRow } from "@/lib/livingHope/api";
import { findMorningReviewJournalEntry } from "@/lib/livingHope/morningReviewJournal";
import { localDateISO } from "@/lib/lifePriorities";
import { useAuth } from "@/contexts/AuthContext";
import { formatUnlockLabel, isLetterUnlockable } from "@/lib/livingHope/letterSections";
import { lh } from "@/lib/livingHope/themeClasses";
import {
  getPhaseProgress,
  getTodayPreview,
  getWorkbookReadiness,
  isSectionComplete,
  RITUAL_STEPS,
} from "@/lib/livingHope/workbookProgress";
import {
  WORKBOOK_PHASES,
  WORKBOOK_SECTIONS,
  type LivingHopeWorkbookContent,
} from "@/lib/livingHope/workbookTypes";
import { IosGroupedRow, IosGroupedSection } from "@/components/living-hope/IosGroupedSection";
import { cn } from "@/lib/utils";

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
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const reviewedToday = !!todayReview;
  const letterStatus = letter?.status ?? "draft";
  const canOpen = letter?.unlock_at && isLetterUnlockable(letter.unlock_at);
  const isSunday = new Date().getDay() === 0;

  const { percent, ritualReady, nextStep } = getWorkbookReadiness(workbook, goals, letter);
  const preview = workbook ? getTodayPreview(workbook) : null;

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (!user?.id || !reviewedToday) {
      setJournalEntryId(null);
      return;
    }
    void findMorningReviewJournalEntry(user.id, todayReview?.review_date ?? localDateISO()).then(setJournalEntryId);
  }, [user?.id, reviewedToday, todayReview?.review_date]);

  const letterDetail = (() => {
    if (letterStatus === "draft") return "Write your 2-year letter";
    if (letterStatus === "sealed" && !canOpen) return `Sealed until ${formatUnlockLabel(letter?.unlock_at ?? null)}`;
    if (letterStatus === "sealed" && canOpen) return "Ready to open";
    return "Opened — review each morning";
  })();

  return (
    <div className="flex-1 flex flex-col py-1 md:py-2 overflow-y-auto scrollbar-hide max-w-xl mx-auto w-full">
      <header className="mb-5 pt-1">
        <p className="text-[13px] text-muted-foreground">{dateStr}</p>
        <div className="mt-0.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[34px] font-bold tracking-tight leading-[1.08] text-foreground">
              Morning formula
            </h1>
            <p className="mt-1 text-[15px] text-muted-foreground leading-snug">
              {greeting} — never look backwards.
            </p>
          </div>
          {streak > 0 ? (
            <span className={cn("shrink-0 mt-2", lh.pillActive)}>{streak}-day streak</span>
          ) : null}
        </div>
      </header>

      <Link to="/living-hope/review" className={cn(lh.heroCard, "block mb-5")}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white/20">
            <Sunrise className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
              Today&apos;s formula
            </p>
            <p className="text-[17px] font-semibold leading-snug mt-0.5">
              {reviewedToday ? "Review again" : ritualReady ? "Enter today's formula" : "Start building"}
            </p>
            <p className="text-[13px] text-white/75 mt-1 leading-snug">
              Manifesto · vision · story · goals · surrender
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 shrink-0 mt-2" aria-hidden />
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {RITUAL_STEPS.map((step) => (
            <span
              key={step.key}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                reviewedToday ? "bg-white/25 text-white" : "bg-black/10 text-white/85",
              )}
            >
              {reviewedToday ? <Check className="w-2.5 h-2.5" /> : null}
              {step.label}
            </span>
          ))}
        </div>
      </Link>

      {reviewedToday && todayReview?.surrender_note ? (
        <IosGroupedSection title="Today's surrender" className="mb-5">
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
          className="mb-5"
        >
          <IosGroupedRow to={nextStep.href} icon={Sparkles} label={nextStep.label} detail="Next step" />
        </IosGroupedSection>
      ) : null}

      {isSunday ? (
        <IosGroupedSection title="This week" className="mb-5">
          <IosGroupedRow
            to="/living-hope/workbook/weekly"
            icon={Calendar}
            label="Weekly review"
            detail="Sunday questions — move the machine"
          />
        </IosGroupedSection>
      ) : null}

      {ritualReady && preview && (preview.manifesto || workbook?.vision_headline || preview.story) ? (
        <IosGroupedSection title="Today's preview" footer="Heb 11:1 · Thy will be done" className="mb-5">
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

      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[22px] font-bold tracking-tight text-foreground">Foundation</h2>
        <span className="text-[13px] text-muted-foreground">{percent}%</span>
      </div>

      {WORKBOOK_PHASES.map((phase) => {
        const prog = workbook
          ? getPhaseProgress(phase.key, workbook, letter)
          : { filled: 0, total: phase.key === "anchor" ? 3 : 0 };
        const sections = WORKBOOK_SECTIONS.filter((s) => s.phase === phase.key);

        return (
          <IosGroupedSection
            key={phase.key}
            title={`${phase.label} · ${prog.filled}/${prog.total}`}
            footer={`${phase.scripture} — ${phase.description}`}
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
      })}
    </div>
  );
}
