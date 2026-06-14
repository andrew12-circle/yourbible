import { useCallback, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { WorkbookStory } from "@/lib/livingHope/workbookTypes";
import { newId } from "@/lib/livingHope/workbookTypes";
import {
  STORY_PLAYTHROUGH_INTRO,
  STORY_PLAYTHROUGH_STEPS,
  composeStoryPlaythrough,
  parseStoryPlaythrough,
  type StoryPlaythroughKey,
  type StoryPlaythroughResponses,
} from "@/lib/livingHope/storyPlaythrough";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  stories: WorkbookStory[];
  suggestedIndex: number;
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number) => void;
  onAddStory: (text: string) => void;
  storyRecall: string;
  onStoryRecallChange: (value: string) => void;
};

export function MorningStoryPanel({
  stories,
  suggestedIndex,
  selectedIndex,
  onSelectedIndexChange,
  onAddStory,
  storyRecall,
  onStoryRecallChange,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newStoryText, setNewStoryText] = useState("");
  const [playStepIndex, setPlayStepIndex] = useState(0);

  const selectedStory =
    selectedIndex != null && selectedIndex >= 0 && selectedIndex < stories.length
      ? stories[selectedIndex]
      : null;

  const [responses, setResponses] = useState<StoryPlaythroughResponses>(() =>
    parseStoryPlaythrough(storyRecall),
  );

  const syncRecall = useCallback(
    (storyText: string, next: StoryPlaythroughResponses) => {
      onStoryRecallChange(composeStoryPlaythrough(storyText, next));
    },
    [onStoryRecallChange],
  );

  const setField = useCallback(
    (key: StoryPlaythroughKey, value: string) => {
      if (!selectedStory) return;
      setResponses((prev) => {
        const next = { ...prev, [key]: value };
        syncRecall(selectedStory.text, next);
        return next;
      });
    },
    [selectedStory, syncRecall],
  );

  const handleSelectStory = useCallback(
    (index: number) => {
      onSelectedIndexChange(index);
      setPlayStepIndex(0);
      const story = stories[index];
      if (story) {
        const parsed = parseStoryPlaythrough(storyRecall);
        const recallStoryMatch = storyRecall.match(/\*\*Story:\*\*\s*([\s\S]*?)(?=\n\n\*\*|$)/i);
        const recallStory = recallStoryMatch?.[1]?.trim();
        if (recallStory !== story.text.trim()) {
          const fresh = { enter: "", senses: "", body: "", live: "" };
          setResponses(fresh);
          syncRecall(story.text, fresh);
        } else {
          setResponses(parsed);
        }
      }
    },
    [onSelectedIndexChange, stories, storyRecall, syncRecall],
  );

  const handleAddStory = useCallback(() => {
    const text = newStoryText.trim();
    if (!text) return;
    onAddStory(text);
    setNewStoryText("");
    setAdding(false);
  }, [newStoryText, onAddStory]);

  const playSteps = STORY_PLAYTHROUGH_STEPS;
  const currentPlayStep = selectedStory ? playSteps[playStepIndex] : null;
  const playProgress = useMemo(
    () => (playSteps.length > 1 ? playStepIndex / (playSteps.length - 1) : 0),
    [playStepIndex, playSteps.length],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className={cn(lh.bodySm, "leading-relaxed")}>{STORY_PLAYTHROUGH_INTRO}</p>

      <section>
        <h2 className={cn(lh.labelUpper, "mb-2")}>Your scenes</h2>
        {stories.length === 0 ? (
          <p className={cn(lh.footnote, "mb-3")}>
            No scenes yet — add one below or in your workbook. Each morning, pick one to play through.
          </p>
        ) : (
          <ul className="space-y-2 list-none p-0 m-0">
            {stories.map((story, index) => {
              const selected = selectedIndex === index;
              const suggested = index === suggestedIndex % Math.max(1, stories.length);
              return (
                <li key={story.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectStory(index)}
                    className={cn(
                      lh.cardFlat,
                      "w-full text-left px-4 py-3 transition-colors",
                      selected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                        aria-hidden
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn(lh.bodySm, "leading-snug")}>{story.text}</p>
                        {suggested ? (
                          <p className={cn(lh.footnote, "mt-1", lh.accentMuted)}>Suggested today</p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {adding ? (
        <section className={cn(lh.cardFlat, "p-4 space-y-3")}>
          <h2 className={cn(lh.heading, "text-[15px]")}>New scene</h2>
          <p className={cn(lh.footnote)}>
            Present tense. One vivid moment — tithing, family, business, home. Real, not fantasy.
          </p>
          <Textarea
            value={newStoryText}
            onChange={(e) => setNewStoryText(e.target.value)}
            rows={3}
            className={lh.textarea}
            placeholder="I'm writing the check for tithe and there's no flinch — just gratitude…"
            aria-label="New story scene"
          />
          <div className="flex gap-2">
            <Button type="button" className={cn(lh.btnSecondary, "h-9")} onClick={handleAddStory}>
              Add to library
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={cn(lh.btnGhost, "h-9")}
              onClick={() => {
                setAdding(false);
                setNewStoryText("");
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(lh.btnGhost, "h-10 w-full justify-center gap-1.5 border-dashed")}
          onClick={() => setAdding(true)}
        >
          <Plus className="h-4 w-4" />
          Add a scene
        </Button>
      )}

      {selectedStory ? (
        <section className="space-y-3 pt-1">
          <div className={cn(lh.visionBanner, "space-y-1")}>
            <p className={cn(lh.labelUpper, lh.accent)}>Playing out now</p>
            <p className={cn(lh.bodyQuote, "text-[16px] not-italic")}>{selectedStory.text}</p>
          </div>

          <div className={lh.progress}>
            <div className={lh.progressFill} style={{ width: `${Math.round(playProgress * 100)}%` }} />
          </div>

          {currentPlayStep ? (
            <div className="space-y-3">
              <div>
                <p className={cn(lh.labelUpper, "mb-1")}>
                  {playStepIndex + 1} of {playSteps.length}
                </p>
                <h3 className={cn(lh.titleMd, "mb-1")}>{currentPlayStep.title}</h3>
                <p className={cn(lh.footnote, "italic leading-snug")}>{currentPlayStep.psychology}</p>
              </div>
              <p className={lh.bodySm}>{currentPlayStep.prompt}</p>
              <Textarea
                value={responses[currentPlayStep.key]}
                onChange={(e) => setField(currentPlayStep.key, e.target.value)}
                rows={currentPlayStep.rows}
                className={lh.textarea}
                placeholder={currentPlayStep.placeholder}
                aria-label={currentPlayStep.title}
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              className={cn(lh.btnGhost, "h-10 px-3")}
              disabled={playStepIndex === 0}
              onClick={() => setPlayStepIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" />
              Back
            </Button>
            {playStepIndex < playSteps.length - 1 ? (
              <Button
                type="button"
                className={cn(lh.btnSecondary, "h-10 px-4")}
                onClick={() => setPlayStepIndex((i) => Math.min(playSteps.length - 1, i + 1))}
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            ) : (
              <span className={cn(lh.footnote, "text-right")}>Thank God before you see it.</span>
            )}
          </div>
        </section>
      ) : stories.length > 0 ? (
        <p className={cn(lh.footnote, "text-center")}>Pick a scene above to play it through.</p>
      ) : null}
    </div>
  );
}

/** Append a story to workbook content; returns new index. */
export function appendWorkbookStory(
  stories: WorkbookStory[],
  text: string,
): { stories: WorkbookStory[]; newIndex: number } {
  const next = [...stories, { id: newId(), text: text.trim() }];
  return { stories: next, newIndex: next.length - 1 };
}
