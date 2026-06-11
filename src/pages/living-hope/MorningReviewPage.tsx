import { useCallback, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { useLivingHope } from "@/hooks/useLivingHope";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { saveMorningReview, type GoalTouch } from "@/lib/livingHope/api";
import { localDateISO } from "@/lib/lifePriorities";
import { toast } from "@/hooks/use-toast";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Step =
  | { kind: "intro" }
  | { kind: "manifesto" }
  | { kind: "vision" }
  | { kind: "story" }
  | { kind: "goal"; goalId: string }
  | { kind: "metrics" }
  | { kind: "surrender" }
  | { kind: "done" };

function daySeed(): number {
  const iso = localDateISO();
  return iso.split("-").reduce((a, b) => a + Number(b), 0);
}

export default function MorningReviewPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { busy, goals, letter, load, setTodayReview } = useLivingHope(user?.id);
  const { busy: wbBusy, workbook } = useLivingHopeWorkbook(user?.id);

  const [stepIndex, setStepIndex] = useState(0);
  const [touches, setTouches] = useState<Record<string, GoalTouch>>({});
  const [visionRecall, setVisionRecall] = useState("");
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [surrender, setSurrender] = useState(
    letter?.surrender_prayer ?? "Father, not my will but Yours. Amen.",
  );
  const [saving, setSaving] = useState(false);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);
  const seed = daySeed();
  const manifestoItem = workbook?.manifesto[seed % Math.max(1, workbook?.manifesto.length ?? 1)];
  const storyItem = workbook?.stories[seed % Math.max(1, workbook?.stories.length ?? 1)];
  const manifestoIndex = workbook?.manifesto.length ? seed % workbook.manifesto.length : 0;
  const storyIndex = workbook?.stories.length ? seed % workbook.stories.length : 0;

  const steps: Step[] = useMemo(() => {
    const s: Step[] = [{ kind: "intro" }];
    if (workbook?.manifesto.length) s.push({ kind: "manifesto" });
    if (workbook?.vision_headline || workbook?.income_lines.length) s.push({ kind: "vision" });
    if (workbook?.stories.length) s.push({ kind: "story" });
    for (const g of activeGoals) s.push({ kind: "goal", goalId: g.id });
    if (workbook?.metrics.length) s.push({ kind: "metrics" });
    s.push({ kind: "surrender" }, { kind: "done" });
    return s;
  }, [workbook, activeGoals]);

  const step = steps[stepIndex] ?? { kind: "done" };
  const currentGoal = step.kind === "goal" ? activeGoals.find((g) => g.id === step.goalId) : null;

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
      });
      setTodayReview(review);
      toast({ title: "Morning review complete" });
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
    setTodayReview,
    steps.length,
  ]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const hasContent =
    !!workbook?.vision_headline ||
    (workbook?.stories.length ?? 0) > 0 ||
    (workbook?.manifesto.length ?? 0) > 0 ||
    activeGoals.length > 0;

  if (!busy && !wbBusy && !hasContent) {
    return (
      <LivingHopeChrome subtitle="Build your workbook first.">
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
          <p className={cn(lh.body, "max-w-xs")}>
            Add vision, stories, manifesto, and goals — then run the morning formula each day.
          </p>
          <Link to="/living-hope">
            <Button className="rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300">
              Open workbook
            </Button>
          </Link>
        </div>
      </LivingHopeChrome>
    );
  }

  const progress = steps.length > 1 ? stepIndex / (steps.length - 1) : 0;
  const loadingAll = busy || wbBusy;

  return (
    <LivingHopeChrome
      subtitle={
        step.kind === "intro"
          ? "Never look backwards."
          : step.kind === "manifesto"
            ? "Manifesto"
            : step.kind === "vision"
              ? "Income vision"
              : step.kind === "story"
                ? "Daily story"
                : step.kind === "goal"
                  ? `Goal ${activeGoals.findIndex((g) => g.id === step.goalId) + 1} of ${activeGoals.length}`
                  : step.kind === "metrics"
                    ? "Metrics"
                    : step.kind === "surrender"
                      ? "Surrender"
                      : "Done"
      }
    >
      {loadingAll ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className={cn("w-6 h-6 animate-spin", lh.spinner)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col py-2">
          <div className={lh.progress}>
            <motion.div
              className="h-full bg-amber-400/80"
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
              {step.kind === "intro" ? (
                <>
                  <h1 className={cn(lh.titleLg, "mb-3")}>Morning formula</h1>
                  <p className={cn(lh.body, "mb-4")}>
                    Manifesto → vision → story → goals → metrics → surrender. Present tense. Faith, not fear.
                  </p>
                  {(letter?.full_letter ?? letter?.outlook) ? (
                    <blockquote className={lh.quote}>
                      {(letter.full_letter ?? letter.outlook ?? "").slice(0, 320)}…
                    </blockquote>
                  ) : null}
                </>
              ) : null}

              {step.kind === "manifesto" && manifestoItem ? (
                <>
                  <h1 className={cn(lh.titleLg, "mb-4")}>Manifesto</h1>
                  <p className={cn(lh.bodyQuote, "mb-0")}>{manifestoItem.text}</p>
                  <p className={cn("text-[13px] mt-6", lh.muted)}>Speak it slowly. Let it land.</p>
                </>
              ) : null}

              {step.kind === "vision" && workbook ? (
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
              ) : null}

              {step.kind === "story" && storyItem ? (
                <>
                  <h1 className={cn(lh.titleLg, "mb-4")}>Story</h1>
                  <p className={lh.bodyLg}>{storyItem.text}</p>
                  <p className={cn("text-[13px] mt-6", lh.muted)}>Picture it. Feel it. Thank God before you see it.</p>
                </>
              ) : null}

              {step.kind === "goal" && currentGoal ? (
                <>
                  <p className={cn(lh.labelUpper, "mb-1 capitalize", lh.accentMuted)}>
                    {currentGoal.domain}
                  </p>
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
              ) : null}

              {step.kind === "metrics" && workbook ? (
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
              ) : null}

              {step.kind === "surrender" ? (
                <>
                  <h1 className={cn(lh.titleLg, "mb-3")}>Surrender</h1>
                  <p className={cn("text-[14px] mb-4", lh.bodySm)}>
                    Not my will, but Yours. I say thank you before I see results.
                  </p>
                  <Textarea
                    value={surrender}
                    onChange={(e) => setSurrender(e.target.value)}
                    rows={5}
                    className={lh.textarea}
                  />
                </>
              ) : null}

              {step.kind === "done" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className={lh.iconBoxLg}>
                    <Check className="w-7 h-7 text-amber-600" />
                  </div>
                  <h1 className={cn(lh.titleLg, "mb-2")}>You&apos;re set</h1>
                  <p className={cn("text-[14px] max-w-xs", lh.bodySm)}>
                    Go live what you saw.
                  </p>
                  <Link to="/journal/life/praise" className={cn("mt-4 text-[13px]", lh.accentLink)}>
                    Praise report →
                  </Link>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {step.kind !== "done" ? (
            <div className="mt-6 pt-2">
              <Button
                className={cn(
                  "w-full rounded-xl h-12 font-medium",
                  "bg-amber-400 text-amber-950 hover:bg-amber-300",
                )}
                disabled={saving}
                onClick={() => {
                  if (step.kind === "surrender") void finish();
                  else setStepIndex((i) => Math.min(i + 1, steps.length - 1));
                }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {step.kind === "surrender" ? "Complete review" : "Continue"}
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
