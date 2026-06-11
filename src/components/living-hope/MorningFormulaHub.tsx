import { Link } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Mail,
  PenLine,
  Sparkles,
  Sunrise,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { LivingHopeGoalRow, LivingHopeLetterRow, LivingHopeReviewRow } from "@/lib/livingHope/api";
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
import { cn } from "@/lib/utils";

type Props = {
  workbook: LivingHopeWorkbookContent | null;
  letter: LivingHopeLetterRow | null;
  goals: LivingHopeGoalRow[];
  todayReview: LivingHopeReviewRow | null;
  streak: number;
};

export function MorningFormulaHub({ workbook, letter, goals, todayReview, streak }: Props) {
  const reviewedToday = !!todayReview;
  const letterStatus = letter?.status ?? "draft";
  const canOpen = letter?.unlock_at && isLetterUnlockable(letter.unlock_at);
  const isSunday = new Date().getDay() === 0;

  const { percent, ritualReady, nextStep } = getWorkbookReadiness(workbook, goals, letter);
  const preview = workbook ? getTodayPreview(workbook) : null;

  const defaultPhase = (() => {
    if (!workbook) return "anchor";
    for (const phase of WORKBOOK_PHASES) {
      const prog = getPhaseProgress(phase.key, workbook, letter);
      if (prog.filled < prog.total) return phase.key;
    }
    return "move";
  })();

  return (
    <div className="flex-1 flex flex-col gap-4 py-2 overflow-y-auto scrollbar-hide max-w-2xl mx-auto w-full">
      <section className={cn(lh.card, "p-4 md:p-5")}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={lh.iconBox}>
              <Sunrise className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className={cn(lh.labelUpper, "text-amber-700/80 mb-0.5")}>Today&apos;s formula</p>
              <h1 className={lh.titleMd}>See it before it arrives</h1>
              <p className={cn("mt-0.5", lh.bodySm)}>
                Present tense. Faith, not fear. End in surrender — not my will, but Yours.
              </p>
            </div>
          </div>
          {streak > 0 ? (
            <span className={cn("shrink-0 text-[11px] font-medium px-2 py-1 rounded-full", lh.pillActive)}>
              {streak}d
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {RITUAL_STEPS.map((step) => (
            <span
              key={step.key}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border",
                reviewedToday
                  ? "bg-amber-400/15 text-amber-900 border-amber-400/30"
                  : "bg-white/60 text-stone-500 border-amber-900/10",
              )}
            >
              {reviewedToday ? <Check className="w-3 h-3" /> : null}
              {step.label}
            </span>
          ))}
        </div>

        <Link to="/living-hope/review" className="block">
          <Button
            className={cn(
              "w-full rounded-xl h-11 font-medium text-sm",
              reviewedToday ? lh.btnReviewed : "bg-amber-400 text-amber-950 hover:bg-amber-300",
            )}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {reviewedToday ? "Enter again" : ritualReady ? "Enter today's formula" : "Start building"}
          </Button>
        </Link>

        {reviewedToday && todayReview?.surrender_note ? (
          <p className={cn("mt-3 text-[12px] italic line-clamp-2", lh.muted)}>
            &ldquo;{todayReview.surrender_note}&rdquo;
          </p>
        ) : (
          <p className={cn("mt-3 text-[11px] text-center", lh.faint)}>Heb 11:1 · Thy will be done</p>
        )}
      </section>

      {!ritualReady && nextStep ? (
        <section className={lh.cardAmber}>
          <div className="p-4">
            <p className={cn(lh.labelUpper, "text-amber-800/70 mb-1")}>Foundation {percent}% ready</p>
            <p className={cn("text-[13px] mb-3", lh.bodySm)}>Build your vision once — review it every morning.</p>
            <Link to={nextStep.href}>
              <Button size="sm" className="rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300 w-full">
                {nextStep.label}
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </section>
      ) : null}

      {isSunday ? (
        <Link to="/living-hope/workbook/weekly" className={cn(lh.card, "p-4 flex items-center gap-3 hover:bg-white/90 transition")}>
          <div className={lh.iconBox}>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-stone-900">Weekly review</p>
            <p className={cn("text-[11px]", lh.faint)}>Sunday questions — move the machine</p>
          </div>
          <ChevronRight className={cn("w-4 h-4 shrink-0", lh.faint)} />
        </Link>
      ) : null}

      {ritualReady && preview && (preview.manifesto || workbook?.vision_headline || preview.story) ? (
        <section className={cn(lh.card, "p-4 space-y-3")}>
          <p className={cn(lh.labelUpper, "text-amber-700/70")}>Today&apos;s preview</p>
          {preview.manifesto?.text ? (
            <div>
              <p className={cn(lh.label, "mb-0.5")}>Manifesto</p>
              <p className="text-[13px] text-stone-700 leading-snug line-clamp-2">{preview.manifesto.text}</p>
            </div>
          ) : null}
          {workbook?.vision_headline ? (
            <div className={lh.visionBanner}>
              <p className={cn(lh.label, "mb-0.5")}>Vision</p>
              <p className="text-[13px] text-stone-700 leading-snug line-clamp-2">{workbook.vision_headline}</p>
              {workbook.income_total_label ? (
                <p className={cn("text-[12px] mt-1", lh.accentMuted)}>{workbook.income_total_label}</p>
              ) : null}
            </div>
          ) : null}
          {preview.story?.text ? (
            <div>
              <p className={cn(lh.label, "mb-0.5")}>Story</p>
              <p className="text-[13px] text-stone-700 leading-snug line-clamp-3">{preview.story.text}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div>
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h2 className={lh.labelUpper}>Foundation</h2>
          {ritualReady ? (
            <span className={cn("text-[11px]", lh.faint)}>{percent}% built</span>
          ) : null}
        </div>

        <Accordion type="multiple" defaultValue={[defaultPhase]} className={cn(lh.card, "px-3 divide-y divide-amber-900/8")}>
          {WORKBOOK_PHASES.map((phase) => {
            const prog = workbook
              ? getPhaseProgress(phase.key, workbook, letter)
              : { filled: 0, total: phase.key === "anchor" ? 3 : 0 };
            const sections = WORKBOOK_SECTIONS.filter((s) => s.phase === phase.key);

            return (
              <AccordionItem key={phase.key} value={phase.key} className="border-0">
                <AccordionTrigger className="py-3 hover:no-underline text-left">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-stone-900">
                      {phase.label}
                      <span className={cn("ml-2 text-[11px] font-normal", lh.faint)}>
                        {prog.filled}/{prog.total}
                      </span>
                    </p>
                    <p className={cn("text-[11px] font-normal", lh.faint)}>
                      {phase.scripture} · {phase.description}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-0">
                  <ul className="space-y-1">
                    {phase.key === "anchor" ? (
                      <li>
                        <Link to="/living-hope/letter" className={lh.row}>
                          <div className="min-w-0 flex items-start gap-2">
                            <Mail className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", lh.icon)} />
                            <div>
                              <p className="text-[13px] text-stone-900">Letter from the future</p>
                              <p className={cn("text-[11px] truncate", lh.faint)}>
                                {letterStatus === "draft" && "Write your 2-year letter"}
                                {letterStatus === "sealed" && !canOpen && `Sealed until ${formatUnlockLabel(letter?.unlock_at ?? null)}`}
                                {letterStatus === "sealed" && canOpen && "Ready to open"}
                                {letterStatus === "opened" && "Opened — review each morning"}
                              </p>
                            </div>
                          </div>
                          <PenLine className={cn("w-3.5 h-3.5 shrink-0", lh.faint)} />
                        </Link>
                      </li>
                    ) : null}
                    {sections.map((s) => {
                      const done = workbook ? isSectionComplete(workbook, s.key) : false;
                      return (
                        <li key={s.key}>
                          <Link to={`/living-hope/workbook/${s.key}`} className={lh.row}>
                            <div className="min-w-0">
                              <p className="text-[13px] text-stone-900 flex items-center gap-1.5">
                                {done ? <Check className="w-3 h-3 text-amber-600 shrink-0" /> : null}
                                {s.label}
                              </p>
                              <p className={cn("text-[11px] truncate", lh.faint)}>{s.hint}</p>
                            </div>
                            <ChevronRight className={cn("w-3.5 h-3.5 shrink-0", lh.faint)} />
                          </Link>
                        </li>
                      );
                    })}
                    {phase.key === "see" && goals.length > 0 ? (
                      <li>
                        <Link to="/living-hope/letter" className={lh.row}>
                          <div className="min-w-0">
                            <p className="text-[13px] text-stone-900">Fractal goals ({goals.length})</p>
                            <p className={cn("text-[11px] truncate", lh.faint)}>
                              {goals
                                .slice(0, 2)
                                .map((g) => g.title)
                                .join(" · ")}
                            </p>
                          </div>
                          <ChevronRight className={cn("w-3.5 h-3.5 shrink-0", lh.faint)} />
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
