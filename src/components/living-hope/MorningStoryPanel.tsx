import { DictateButton } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
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

const ACE_SCENE_URL =
  "https://chatgpt.com/g/g-p-6868a9d4590481918f3bfd31e01c3abe-god/c/6ab3ed65-d60c-83ea-a731-279c06afe97c";

const ACE_SCENE = {
  title: "ACE Is Working",
  description:
    "Eight appointments. Six conversations. Three applications. Two deals. Work feels ordered, useful, and light — then the laptop closes and life continues.",
  url: ACE_SCENE_URL,
};

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
  const { user, profile } = useAuth();
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
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className={cn(lh.labelUpper, "mb-1")}>Play a scene</h2>
            <p className={lh.footnote}>Choose a scene, open it, then use ChatGPT Read Aloud and close your eyes.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className={cn(lh.cardFlat, "overflow-hidden")}>
            <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-700 to-amber-100">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_38%)]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Business · provision · margin</p>
                <h3 className="text-lg font-semibold leading-tight">{ACE_SCENE.title}</h3>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <p className={cn(lh.bodySm, "line-clamp-3 leading-relaxed")}>{ACE_SCENE.description}</p>
              <Button asChild className={cn(lh.btnPrimary, "w-full gap-2")}>
                <a href={ACE_SCENE.url} target="_blank" rel="noopener noreferrer">
                  <Play className="h-4 w-4" />
                  Play scene
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              </Button>
            </div>
          </article>

          {stories.map((story, index) => {
            const selected = selectedIndex === index;
            const suggested = index === suggestedIndex % Math.max(1, stories.length);
            const title = story.title?.trim() || `Scene ${index + 1}`;
            return (
              <article
                key={story.id}
                className={cn(
                  lh.cardFlat,
                  "overflow-hidden transition-shadow",
                  selected ? "border-primary/50 ring-1 ring-primary/30" : "",
                )}
              >
                <button type="button" onClick={() => handleSelectStory(index)} className="block w-full text-left">
                  <div
                    className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-muted via-background to-primary/10 bg-cover bg-center"
                    style={story.cover_image_url ? { backgroundImage: `url("${story.cover_image_url}")` } : undefined}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      {suggested ? (
                        <span className="rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm">
                          Suggested today
                        </span>
                      ) : null}
                      {selected ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <h3 className="text-base font-semibold leading-tight">{title}</h3>
                    </div>
                  </div>
                </button>
                <div className="space-y-3 p-4">
                  <p className={cn(lh.bodySm, "line-clamp-3 leading-relaxed")}>{story.text}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(lh.btnSecondary, "flex-1 gap-2")}
                      onClick={() => handleSelectStory(index)}
                    >
                      <Play className="h-4 w-4" />
                      Play here
                    </Button>
                    {story.chatgpt_url ? (
                      <Button asChild className={cn(lh.btnPrimary, "flex-1 gap-2")}>
                        <a href={story.chatgpt_url} target="_blank" rel="noopener noreferrer">
                          Listen
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {stories.length === 0 ? (
          <p className={cn(lh.footnote, "mt-3")}>
            Your saved scene library is empty. Add scenes below; each one can later have its own cover image and narration link.
          </p>
        ) : null}
      </section>

      {adding ? (
        <section className={cn(lh.cardFlat, "p-4 space-y-3")}>
          <h2 className={cn(lh.heading, "text-[15px]")}>New scene</h2>
          <JournalAiPrivacy.Provider value={Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled}><div className="flex items-center gap-2"><DictateButton userId={user?.id} webSpeechOnly onAppend={(chunk) => setNewStoryText((text) => `${text} ${chunk}`.trim())} /><span className="text-sm">Speak a new scene</span></div></JournalAiPrivacy.Provider>
          <p className={cn(lh.footnote)}>
            Present tense. One vivid moment — tithing, family, business, home. Real, not fantasy.
          </p>
          <MorningVoiceField
            value={newStoryText}
            onChange={setNewStoryText}
            multiline
            rows={3}
            label="New story scene"
            placeholder="I'm writing the check for tithe and there's no flinch — just gratitude…"
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
              <MorningVoiceField
                value={responses[currentPlayStep.key]}
                onChange={(value) => setField(currentPlayStep.key, value)}
                multiline
                rows={currentPlayStep.rows}
                label={currentPlayStep.title}
                placeholder={currentPlayStep.placeholder}
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
