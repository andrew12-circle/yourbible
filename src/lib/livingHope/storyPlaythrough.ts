/** Guided playthrough for one workbook story — present-tense, multisensory mental rehearsal. */

export type StoryPlaythroughKey = "enter" | "senses" | "body" | "live";

export interface StoryPlaythroughResponses {
  enter: string;
  senses: string;
  body: string;
  live: string;
}

export interface StoryPlaythroughStepDef {
  key: StoryPlaythroughKey;
  title: string;
  psychology: string;
  prompt: string;
  placeholder: string;
  rows: number;
}

export const STORY_PLAYTHROUGH_INTRO =
  "These are scenes you return to — not wishful thinking. Pick one and play it through as if it is happening now. Same nervous system, same truth.";

export const STORY_PLAYTHROUGH_STEPS: readonly StoryPlaythroughStepDef[] = [
  {
    key: "enter",
    title: "Step into the scene",
    psychology: "Spatial + temporal anchoring — the brain treats vivid place as memory.",
    prompt: "Where are you? What moment is this? Look around in present tense.",
    placeholder: "I'm walking into the office. The morning is quiet. Everything is already handled…",
    rows: 3,
  },
  {
    key: "senses",
    title: "Temperature, light, smell, sound",
    psychology: "Multisensory detail bypasses analysis — the scene feels real before you believe it.",
    prompt: "Air on your skin, quality of light, what's in the air, what you hear or don't hear.",
    placeholder: "Cool AC, warm coffee, clean house smell, no panic on my phone…",
    rows: 3,
  },
  {
    key: "body",
    title: "How you feel in your body",
    psychology: "Interoception tells the subconscious the scene is safe enough to inhabit.",
    prompt: "Posture, breath, chest, jaw — and the steady emotion underneath (not hype).",
    placeholder: "Shoulders down. Breath slow. Quiet confidence — I belong here.",
    rows: 2,
  },
  {
    key: "live",
    title: "Play it through",
    psychology: "Present-tense narrative consolidates imagination into identity — you already live this.",
    prompt: "2–4 sentences: walk through the story beat by beat, as if it's Tuesday right now.",
    placeholder: "I open the dashboard and it's green. I tithe without flinching. Lilly is laughing down the hall…",
    rows: 5,
  },
] as const;

export function emptyStoryPlaythroughResponses(): StoryPlaythroughResponses {
  return { enter: "", senses: "", body: "", live: "" };
}

const SECTION_LABELS: Record<StoryPlaythroughKey, string> = {
  enter: "Scene",
  senses: "Senses",
  body: "Body",
  live: "Playthrough",
};

export function composeStoryPlaythrough(storyText: string, responses: StoryPlaythroughResponses): string {
  const parts: string[] = [];
  const scene = storyText.trim();
  if (scene) parts.push(`**Story:** ${scene}`);

  for (const step of STORY_PLAYTHROUGH_STEPS) {
    const value = responses[step.key].trim();
    if (value) parts.push(`**${SECTION_LABELS[step.key]}:** ${value}`);
  }
  return parts.join("\n\n");
}

export function parseStoryPlaythrough(raw: string | null | undefined): StoryPlaythroughResponses {
  const empty = emptyStoryPlaythroughResponses();
  const text = raw?.trim();
  if (!text) return empty;

  const next = { ...empty };
  for (const step of STORY_PLAYTHROUGH_STEPS) {
    const label = SECTION_LABELS[step.key];
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*|$)`, "i");
    const match = text.match(re);
    if (match?.[1]) next[step.key] = match[1].trim();
  }
  return next;
}

export function storyPlaythroughProgress(responses: StoryPlaythroughResponses): number {
  const filled = STORY_PLAYTHROUGH_STEPS.filter((s) => responses[s.key].trim().length > 0).length;
  return filled / STORY_PLAYTHROUGH_STEPS.length;
}
