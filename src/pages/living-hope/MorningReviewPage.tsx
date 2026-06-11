import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { MorningRitualStepPanels } from "@/components/living-hope/MorningRitualStepPanels";
import { useLivingHope } from "@/hooks/useLivingHope";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { useMorningDailyReading } from "@/hooks/useMorningDailyReading";
import { saveMorningReview, type GoalTouch } from "@/lib/livingHope/api";
import {
  defaultMorningReviewDate,
  syncMorningReviewToJournal,
} from "@/lib/livingHope/morningReviewJournal";
import {
  DEFAULT_SURRENDER_PRAYER,
  buildRitualSteps,
  emptyConnectionNotes,
  emptyDailyAssignment,
  ritualStepSubtitle,
  type DailyAssignment,
  type MorningConnectionNotes,
} from "@/lib/livingHope/morningRitual";
import { livingHopeDaySeed } from "@/lib/livingHope/workbookProgress";
import { toast } from "@/hooks/use-toast";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

export default function MorningReviewPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { busy, goals, letter, load, setTodayReview } = useLivingHope(user?.id);
  const { busy: wbBusy, workbook } = useLivingHopeWorkbook(user?.id);
  const {
    reading,
    busy: readingBusy,
    error: readingError,
    generate,
    ensureReading,
  } = useMorningDailyReading(user?.id);

  const [stepIndex, setStepIndex] = useState(0);
  const [touches, setTouches] = useState<Record<string, GoalTouch>>({});
  const [visionRecall, setVisionRecall] = useState("");
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [worshipNote, setWorshipNote] = useState("");
  const [thanksgivingNote, setThanksgivingNote] = useState("");
  const [prayerNote, setPrayerNote] = useState("");
  const [scriptureReflection, setScriptureReflection] = useState("");
  const [dailyAssignment, setDailyAssignmentState] = useState<DailyAssignment>(emptyDailyAssignment());
  const [surrender, setSurrender] = useState(
    letter?.surrender_prayer?.trim() || DEFAULT_SURRENDER_PRAYER,
  );
  const [saving, setSaving] = useState(false);
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const seed = livingHopeDaySeed();
  const manifestoItem = workbook?.manifesto[seed % Math.max(1, workbook?.manifesto.length ?? 1)];
  const storyItem = workbook?.stories[seed % Math.max(1, workbook?.stories.length ?? 1)];
  const manifestoIndex = workbook?.manifesto.length ? seed % workbook.manifesto.length : 0;
  const storyIndex = workbook?.stories.length ? seed % workbook.stories.length : 0;

  const steps = useMemo(() => buildRitualSteps(workbook, activeGoals), [workbook, activeGoals]);
  const step = steps[stepIndex] ?? { kind: "done" as const };
  const currentGoal = step.kind === "goal" ? activeGoals.find((g) => g.id === step.goalId) : null;
  const goalIndex = step.kind === "goal" ? activeGoals.findIndex((g) => g.id === step.goalId) : 0;

  const setDailyAssignment = useCallback((patch: Partial<DailyAssignment>) => {
    setDailyAssignmentState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setTouch = useCallback((goalId: string, patch: Partial<GoalTouch>) => {
    setTouches((prev) => ({
      ...prev,
      [goalId]: {
        goal_id: goalId,
        vivid_recall: prev[goalId]?.vivid_recall ?? "",
        obedience_step: prev[goalId]?.obedience_step ?? "",
        ...patch,
      },
    }));
  }, []);

  useEffect(() => {
    if (step.kind === "scripture") void ensureReading();
  }, [step.kind, ensureReading]);

  useEffect(() => {
    if (letter?.surrender_prayer?.trim() && surrender === DEFAULT_SURRENDER_PRAYER) {
      setSurrender(letter.surrender_prayer);
    }
  }, [letter?.surrender_prayer, surrender]);

  const connectionNotes = useMemo((): MorningConnectionNotes => {
    const base = emptyConnectionNotes();
    return {
      ...base,
      worship_note: worshipNote.trim() || undefined,
      thanksgiving_note: thanksgivingNote.trim() || undefined,
      prayer_note: prayerNote.trim() || undefined,
      scripture_ref: reading?.reference,
      scripture_reflection: scriptureReflection.trim() || undefined,
      daily_assignment: dailyAssignment,
    };
  }, [worshipNote, thanksgivingNote, prayerNote, reading?.reference, scriptureReflection, dailyAssignment]);

  const finish = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const goal_touches = activeGoals.map((g) => touches[g.id] ?? {
        goal_id: g.id,
        vivid_recall: g.vivid_detail ?? "",
        obedience_step: "",
      });
      const review = await saveMorningReview(user.id, {
        surrender_note: surrender,
        goal_touches,
        vision_recall: visionRecall,
        story_index: storyIndex,
        manifesto_index: manifestoIndex,
        metric_values: Object.fromEntries(
          Object.entries(metricValues).map(([k, v]) => [k, Number.isNaN(Number(v)) ? v : Number(v)]),
        ),
        connection_notes: connectionNotes,
      });
      setTodayReview(review);
      try {
        const synced = await syncMorningReviewToJournal(user.id, {
          reviewDate: defaultMorningReviewDate(),
          surrenderNote: surrender,
          visionRecall,
          goalTouches: goal_touches,
          manifestoIndex,
          storyIndex,
          metricValues,
          connectionNotes,
          workbook: workbook ?? null,
          goals: activeGoals,
        });
        if (synced?.entryId) setJournalEntryId(synced.entryId);
      } catch {
        // Review saved; journal sync is best-effort (offline / local-only).
      }
      toast({ title: "Morning review complete", description: "Saved to your journal and mind map." });
      setStepIndex(steps.length - 1);
    } catch (e) {
      toast({
        title: "Couldn't save review",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [
    user?.id,
    activeGoals,
    touches,
    surrender,
    visionRecall,
    storyIndex,
    manifestoIndex,
    metricValues,
    connectionNotes,
    setTodayReview,
    steps.length,
    workbook,
  ]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const progress = steps.length > 1 ? stepIndex / (steps.length - 1) : 0;
  const loadingAll = busy || wbBusy;

  return (
    <LivingHopeChrome subtitle={ritualStepSubtitle(step, goalIndex, activeGoals.length)}>
      {loadingAll ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className={cn("w-6 h-6 animate-spin", lh.spinner)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col py-2">
          <div className={lh.progress}>
            <motion.div
              className={lh.progressFill}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col"
            >
              <MorningRitualStepPanels
                step={step}
                letter={letter}
                workbook={workbook}
                manifestoItem={manifestoItem}
                storyItem={storyItem}
                currentGoal={currentGoal}
                touches={touches}
                setTouch={setTouch}
                visionRecall={visionRecall}
                setVisionRecall={setVisionRecall}
                metricValues={metricValues}
                setMetricValues={setMetricValues}
                worshipNote={worshipNote}
                setWorshipNote={setWorshipNote}
                thanksgivingNote={thanksgivingNote}
                setThanksgivingNote={setThanksgivingNote}
                prayerNote={prayerNote}
                setPrayerNote={setPrayerNote}
                scriptureReflection={scriptureReflection}
                setScriptureReflection={setScriptureReflection}
                dailyAssignment={dailyAssignment}
                setDailyAssignment={setDailyAssignment}
                surrender={surrender}
                setSurrender={setSurrender}
                reading={reading}
                readingBusy={readingBusy}
                readingError={readingError}
                onGenerateReading={() => void generate()}
                journalEntryId={journalEntryId}
              />
            </motion.div>
          </AnimatePresence>

          {step.kind !== "done" ? (
            <div className="mt-6 pt-2">
              <Button
                className={lh.btnPrimary}
                disabled={saving}
                onClick={() => {
                  const isLastBeforeDone =
                    stepIndex === steps.length - 2 && steps[steps.length - 1]?.kind === "done";
                  if (isLastBeforeDone) void finish();
                  else setStepIndex((i) => Math.min(i + 1, steps.length - 1));
                }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {stepIndex === steps.length - 2 ? "Complete review" : "Continue"}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              className={cn(lh.btnDone, "mt-6")}
              onClick={() => {
                void load();
                navigate("/living-hope");
              }}
            >
              Back to Morning formula
            </Button>
          )}
        </div>
      )}
    </LivingHopeChrome>
  );
}
