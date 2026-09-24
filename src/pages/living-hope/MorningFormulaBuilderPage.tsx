import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Loader2, Pencil, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { MorningStoryPanel } from "@/components/living-hope/MorningStoryPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import {
  DEFAULT_MORNING_FORMULA_STEPS,
  newId,
  type MorningFormulaStepConfig,
  type MorningFormulaStepKind,
  type WorkbookStory,
} from "@/lib/livingHope/workbookTypes";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

const STEP_META: Record<
  MorningFormulaStepKind,
  { label: string; detail: string; editHref?: string }
> = {
  worship: {
    label: "Worship",
    detail: "Open with praise and your saved worship music.",
  },
  thanksgiving: {
    label: "Thanksgiving",
    detail: "Thank God for what is here and what has not happened yet.",
  },
  scripture: {
    label: "Scripture",
    detail: "Read the daily passage and capture what stands out.",
  },
  prayer: {
    label: "Conversation",
    detail: "Pray, listen, and journal the conversation.",
  },
  manifesto: {
    label: "Manifesto",
    detail: "Review who you are becoming.",
    editHref: "/living-hope/workbook/manifesto",
  },
  vision: {
    label: "Vision",
    detail: "Review the life, home, provision, and future you are building toward.",
    editHref: "/living-hope/workbook/vision",
  },
  story: {
    label: "Scenes",
    detail: "Read or listen to one of your saved visualization scenes.",
  },
  surrender: {
    label: "Surrender",
    detail: "Release the outcome and put the plan back in God's hands.",
  },
  covering: {
    label: "Covering",
    detail: "Pray your covering and warfare prayer.",
  },
  assignment: {
    label: "Today's assignment",
    detail: "Set the faithful priorities and boundaries for today.",
  },
  goals: {
    label: "Goals",
    detail: "Touch each active goal and choose the next obedience step.",
  },
  metrics: {
    label: "Metrics",
    detail: "Review the numbers you are intentionally tracking.",
    editHref: "/living-hope/workbook/metrics",
  },
};

function moveStep(
  steps: MorningFormulaStepConfig[],
  index: number,
  direction: -1 | 1,
): MorningFormulaStepConfig[] {
  const target = index + direction;
  if (target < 0 || target >= steps.length) return steps;
  const next = steps.map((step) => ({ ...step }));
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function MorningFormulaBuilderPage() {
  const { user, loading } = useAuth();
  const { busy, workbook, update } = useLivingHopeWorkbook(user?.id);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);

  const steps = useMemo(
    () =>
      workbook?.morning_formula_steps?.length
        ? workbook.morning_formula_steps
        : DEFAULT_MORNING_FORMULA_STEPS,
    [workbook?.morning_formula_steps],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (busy || !workbook) {
    return (
      <LivingHopeChrome backTo="/living-hope" title="Edit Morning Formula">
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className={cn("h-6 w-6 animate-spin", lh.spinner)} />
        </div>
      </LivingHopeChrome>
    );
  }

  const saveSteps = (next: MorningFormulaStepConfig[]) => {
    update({ morning_formula_steps: next });
  };

  const toggleStep = (kind: MorningFormulaStepKind, enabled: boolean) => {
    saveSteps(steps.map((step) => (step.kind === kind ? { ...step, enabled } : step)));
  };

  const addStory = (text: string) => {
    const story: WorkbookStory = {
      id: newId(),
      text,
      narration_provider: "elevenlabs",
    };
    update({ stories: [...workbook.stories, story] });
    setSelectedSceneIndex(workbook.stories.length);
  };

  const updateStory = (index: number, patch: Partial<WorkbookStory>) => {
    update({
      stories: workbook.stories.map((story, storyIndex) =>
        storyIndex === index ? { ...story, ...patch } : story,
      ),
    });
  };

  const deleteStory = (index: number) => {
    update({ stories: workbook.stories.filter((_, storyIndex) => storyIndex !== index) });
    setSelectedSceneIndex((current) => {
      if (current == null) return null;
      if (current === index) return null;
      return current > index ? current - 1 : current;
    });
  };

  return (
    <LivingHopeChrome
      backTo="/living-hope"
      title="Edit Morning Formula"
      subtitle="Change the reusable formula without starting today's session."
    >
      <div className="mx-auto w-full max-w-5xl space-y-8 py-4 sm:py-6">
        <section className={cn(lh.cardFlat, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" aria-hidden />
                <h1 className={lh.titleLg}>Formula builder</h1>
              </div>
              <p className={cn("mt-2 max-w-2xl", lh.bodySm)}>
                These changes affect future Morning Formula sessions. They do not rewrite a Morning
                Formula you already completed or change its journal entry.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() =>
                saveSteps(DEFAULT_MORNING_FORMULA_STEPS.map((step) => ({ ...step })))
              }
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset order
            </Button>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className={lh.titleMd}>Formula order</h2>
            <p className={lh.footnote}>
              Turn a step off or move it. Intro and completion stay automatic.
            </p>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => {
              const meta = STEP_META[step.kind];
              return (
                <div
                  key={step.kind}
                  className={cn(
                    lh.cardFlat,
                    "flex items-center gap-3 px-3 py-3 sm:px-4",
                    !step.enabled && "opacity-60",
                  )}
                >
                  <div className="flex shrink-0 flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => saveSteps(moveStep(steps, index, -1))}
                      aria-label={`Move ${meta.label} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === steps.length - 1}
                      onClick={() => saveSteps(moveStep(steps, index, 1))}
                      aria-label={`Move ${meta.label} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{meta.label}</p>
                      {!step.enabled ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Off
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {meta.detail}
                    </p>
                    {meta.editHref ? (
                      <Button asChild variant="link" className="mt-1 h-auto p-0 text-sm">
                        <Link to={meta.editHref}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit content
                        </Link>
                      </Button>
                    ) : step.kind === "story" ? (
                      <a href="#scenes" className="mt-1 inline-flex items-center text-sm font-medium text-primary">
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit scenes below
                      </a>
                    ) : null}
                  </div>

                  <Switch
                    checked={step.enabled}
                    onCheckedChange={(checked) => toggleStep(step.kind, checked)}
                    aria-label={`${step.enabled ? "Disable" : "Enable"} ${meta.label}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section id="scenes" className="scroll-mt-6 border-t border-border/60 pt-7">
          <div className="mb-4">
            <h2 className={lh.titleMd}>Scenes</h2>
            <p className={lh.footnote}>
              Add, rewrite, delete, preview, upload a cover, or attach your ElevenLabs recording here.
              You do not need to start the Morning Formula to maintain this library.
            </p>
          </div>

          <MorningStoryPanel
            stories={workbook.stories}
            suggestedIndex={workbook.stories.length ? 0 : -1}
            selectedIndex={selectedSceneIndex}
            onSelectedIndexChange={setSelectedSceneIndex}
            onAddStory={addStory}
            onUpdateStory={updateStory}
            onDeleteStory={deleteStory}
            storyRecall=""
            onStoryRecallChange={() => undefined}
          />
        </section>
      </div>
    </LivingHopeChrome>
  );
}
