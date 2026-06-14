import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { MorningRitualStepPanels } from "@/components/living-hope/MorningRitualStepPanels";
import { appendWorkbookStory } from "@/components/living-hope/MorningStoryPanel";
import { useLivingHope } from "@/hooks/useLivingHope";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { useMorningScripture } from "@/hooks/useMorningScripture";
import { useMorningConversationEntry } from "@/hooks/useMorningConversationEntry";
import { supabase } from "@/integrations/supabase/client";
import { saveMorningReview, type GoalTouch } from "@/lib/livingHope/api";
import { extractWorshipNote } from "@/lib/livingHope/morningConversationJournal";
import {
  defaultMorningReviewDate,
  syncMorningReviewToJournal,
} from "@/lib/livingHope/morningReviewJournal";
import { DEFAULT_COVERING_PRAYER } from "@/lib/livingHope/coveringPrayer";
import {
  DEFAULT_SURRENDER_PRAYER,
  buildRitualSteps,
  compactThanksgivingLists,
  emptyConnectionNotes,
  emptyDailyAssignment,
  emptyThanksgivingLists,
  ritualStepSubtitle,
  type DailyAssignment,
  type MorningConnectionNotes,
} from "@/lib/livingHope/morningRitual";
import { livingHopeDaySeed } from "@/lib/livingHope/workbookProgress";
import { isLocalModeNotified } from "@/lib/livingHope/livingHopeLocalStore";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { toast } from "@/hooks/use-toast";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

export default function MorningReviewPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { busy, goals, letter, load, setTodayReview } = useLivingHope(user?.id);
  const { busy: wbBusy, workbook, update: updateWorkbook } = useLivingHopeWorkbook(user?.id);
  const [searchParams] = useSearchParams();
  const {
    scripture,
    busy: scriptureBusy,
    error: scriptureError,
    generateDaily,
    ensureScripture,
  } = useMorningScripture(user?.id);
  const {
    entryId: conversationEntryId,
    preview: conversationPreview,
    busy: conversationBusy,
    error: conversationError,
    ensureEntry: ensureConversationEntry,
    refreshPreview: refreshConversationPreview,
    syncThanksgiving: syncThanksgivingToJournal,
  } = useMorningConversationEntry(user?.id);

  const [stepIndex, setStepIndex] = useState(0);
  const [touches, setTouches] = useState<Record<string, GoalTouch>>({});
  const [visionRecall, setVisionRecall] = useState("");
  const [storyRecall, setStoryRecall] = useState("");
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [thanksgivingNow, setThanksgivingNow] = useState(() => emptyThanksgivingLists().now);
  const [thanksgivingNotYet, setThanksgivingNotYet] = useState(() => emptyThanksgivingLists().notYet);
  const [scriptureReflection, setScriptureReflection] = useState("");
  const [dailyAssignment, setDailyAssignmentState] = useState<DailyAssignment>(emptyDailyAssignment());
  const [surrender, setSurrender] = useState(
    letter?.surrender_prayer?.trim() || DEFAULT_SURRENDER_PRAYER,
  );
  const [covering, setCovering] = useState(DEFAULT_COVERING_PRAYER);
  const [saving, setSaving] = useState(false);
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);
  const restoredFormulaStep = useRef(false);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const seed = livingHopeDaySeed();
  const manifestoItem = workbook?.manifesto[seed % Math.max(1, workbook?.manifesto.length ?? 1)];
  const manifestoIndex = workbook?.manifesto.length ? seed % workbook.manifesto.length : 0;
  const storySuggestedIndex = workbook?.stories.length ? seed % workbook.stories.length : 0;

  const [storySelectedIndex, setStorySelectedIndex] = useState<number | null>(null);
  const storyIndex =
    storySelectedIndex ??
    (workbook?.stories.length ? storySuggestedIndex : null);

  const steps = useMemo(() => buildRitualSteps(workbook, activeGoals), [workbook, activeGoals]);
  const step = steps[stepIndex] ?? { kind: "done" as const };
  const currentGoal = step.kind === "goal" ? activeGoals.find((g) => g.id === step.goalId) : null;
  const goalIndex = step.kind === "goal" ? activeGoals.findIndex((g) => g.id === step.goalId) : 0;

  const setDailyAssignment = useCallback((patch: Partial<DailyAssignment>) => {
    setDailyAssignmentState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAddStory = useCallback(
    (text: string) => {
      if (!workbook) return;
      const { stories, newIndex } = appendWorkbookStory(workbook.stories, text);
      updateWorkbook({ stories });
      setStorySelectedIndex(newIndex);
      setStoryRecall("");
    },
    [workbook, updateWorkbook],
  );

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
    if (!workbook?.stories.length) return;
    setStorySelectedIndex((prev) => (prev == null ? storySuggestedIndex : prev));
  }, [workbook?.stories.length, storySuggestedIndex]);

  const thanksgivingSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step.kind === "scripture") void ensureScripture();
  }, [step.kind, ensureScripture]);

  useEffect(() => {
    if (step.kind === "worship" || step.kind === "thanksgiving" || step.kind === "prayer") {
      void ensureConversationEntry();
    }
  }, [step.kind, ensureConversationEntry]);

  useEffect(() => {
    if ((step.kind === "worship" || step.kind === "prayer") && conversationEntryId) {
      void refreshConversationPreview(conversationEntryId);
    }
  }, [step.kind, conversationEntryId, refreshConversationPreview]);

  useEffect(() => {
    if (step.kind !== "thanksgiving") return;
    if (thanksgivingSaveTimer.current) clearTimeout(thanksgivingSaveTimer.current);
    thanksgivingSaveTimer.current = setTimeout(() => {
      thanksgivingSaveTimer.current = null;
      void syncThanksgivingToJournal({ now: thanksgivingNow, notYet: thanksgivingNotYet });
    }, 700);
    return () => {
      if (thanksgivingSaveTimer.current) clearTimeout(thanksgivingSaveTimer.current);
    };
  }, [step.kind, thanksgivingNow, thanksgivingNotYet, syncThanksgivingToJournal]);

  useEffect(() => {
    if (restoredFormulaStep.current || !steps.length) return;
    const stepParam = searchParams.get("step");
    if (stepParam !== "scripture" && stepParam !== "conversation" && stepParam !== "worship") return;
    const kind =
      stepParam === "conversation" ? "prayer" : stepParam === "worship" ? "worship" : "scripture";
    const idx = steps.findIndex((s) => s.kind === kind);
    if (idx >= 0) {
      setStepIndex(idx);
      restoredFormulaStep.current = true;
    }
  }, [searchParams, steps]);

  const setThanksgivingNowItem = useCallback((index: number, value: string) => {
    setThanksgivingNow((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const setThanksgivingNotYetItem = useCallback((index: number, value: string) => {
    setThanksgivingNotYet((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  useEffect(() => {
    if (letter?.surrender_prayer?.trim() && surrender === DEFAULT_SURRENDER_PRAYER) {
      setSurrender(letter.surrender_prayer);
    }
  }, [letter?.surrender_prayer, surrender]);

  const connectionNotes = useMemo((): MorningConnectionNotes => {
    const base = emptyConnectionNotes();
    const thanksgiving = compactThanksgivingLists({ now: thanksgivingNow, notYet: thanksgivingNotYet });
    return {
      ...base,
      ...thanksgiving,
      conversation_entry_id: conversationEntryId ?? undefined,
      prayer_note: conversationPreview?.excerpt || undefined,
      scripture_ref: scripture?.reference,
      scripture_reflection: scriptureReflection.trim() || undefined,
      story_recall: storyRecall.trim() || undefined,
      covering_note: covering.trim() || undefined,
      daily_assignment: dailyAssignment,
    };
  }, [
    thanksgivingNow,
    thanksgivingNotYet,
    conversationEntryId,
    conversationPreview?.excerpt,
    scripture?.reference,
    scriptureReflection,
    dailyAssignment,
    storyRecall,
    covering,
  ]);

  const finish = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const goal_touches = activeGoals.map((g) => touches[g.id] ?? {
        goal_id: g.id,
        vivid_recall: g.vivid_detail ?? "",
        obedience_step: "",
      });

      let worshipNote: string | undefined;
      if (conversationEntryId) {
        const { data } = await supabase
          .from("journal_entries")
          .select("body")
          .eq("id", conversationEntryId)
          .eq("user_id", user.id)
          .maybeSingle();
        worshipNote = data?.body ? extractWorshipNote(String(data.body)) : undefined;
      }

      const finalConnectionNotes: MorningConnectionNotes = {
        ...connectionNotes,
        worship_note: worshipNote,
      };

      const review = await saveMorningReview(user.id, {
        surrender_note: surrender,
        goal_touches,
        vision_recall: visionRecall,
        story_index: storyIndex ?? undefined,
        manifesto_index: manifestoIndex,
        metric_values: Object.fromEntries(
          Object.entries(metricValues).map(([k, v]) => [k, Number.isNaN(Number(v)) ? v : Number(v)]),
        ),
        connection_notes: finalConnectionNotes,
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
          connectionNotes: finalConnectionNotes,
          workbook: workbook ?? null,
          goals: activeGoals,
        });
        if (synced?.entryId) setJournalEntryId(synced.entryId);
      } catch {
        // Review saved; journal sync is best-effort (offline / local-only).
      }
      toast({
        title: "Morning review complete",
        description: isLocalModeNotified()
          ? "Saved on this device. Apply Living Hope migrations to sync to the cloud."
          : "Saved to your journal and mind map.",
      });
      setStepIndex(steps.length - 1);
    } catch (e) {
      toast({
        title: "Couldn't save review",
        description: formatSupabaseError(e),
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
    conversationEntryId,
    setTodayReview,
    steps.length,
    workbook,
  ]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const progress = steps.length > 1 ? stepIndex / (steps.length - 1) : 0;
  const loadingAll = busy || wbBusy;

  return (
    <LivingHopeChrome title="Today's formula" subtitle={ritualStepSubtitle(step, goalIndex, activeGoals.length)}>
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
                storySuggestedIndex={storySuggestedIndex}
                storySelectedIndex={storySelectedIndex}
                onStorySelectedIndexChange={setStorySelectedIndex}
                onAddStory={handleAddStory}
                storyRecall={storyRecall}
                setStoryRecall={setStoryRecall}
                currentGoal={currentGoal}
                touches={touches}
                setTouch={setTouch}
                visionRecall={visionRecall}
                setVisionRecall={setVisionRecall}
                metricValues={metricValues}
                setMetricValues={setMetricValues}
                thanksgivingNow={thanksgivingNow}
                thanksgivingNotYet={thanksgivingNotYet}
                onThanksgivingNowChange={setThanksgivingNowItem}
                onThanksgivingNotYetChange={setThanksgivingNotYetItem}
                conversationEntryId={conversationEntryId}
                conversationPreview={conversationPreview}
                conversationBusy={conversationBusy}
                conversationError={conversationError}
                scriptureReflection={scriptureReflection}
                setScriptureReflection={setScriptureReflection}
                dailyAssignment={dailyAssignment}
                setDailyAssignment={setDailyAssignment}
                surrender={surrender}
                setSurrender={setSurrender}
                covering={covering}
                setCovering={setCovering}
                scripture={scripture}
                scriptureBusy={scriptureBusy}
                scriptureError={scriptureError}
                onGenerateScripture={() => void generateDaily()}
                journalEntryId={journalEntryId}
                worshipPlaylistUrl={workbook?.worship_playlist_url ?? ""}
                worshipPlaylistHistory={workbook?.worship_music_history ?? []}
                onWorshipMusicChange={({ url, history }) =>
                  updateWorkbook({ worship_playlist_url: url, worship_music_history: history })
                }
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
                  else {
                    if (step.kind === "thanksgiving") {
                      if (thanksgivingSaveTimer.current) {
                        clearTimeout(thanksgivingSaveTimer.current);
                        thanksgivingSaveTimer.current = null;
                      }
                      void syncThanksgivingToJournal({ now: thanksgivingNow, notYet: thanksgivingNotYet });
                    }
                    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
                  }
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
