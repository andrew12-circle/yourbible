import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

/** Keys for each guided embodiment beat (PETTLEP + olfactory / interoceptive cues). */
export type VisionEmbodimentKey =
  | "where"
  | "temperature"
  | "light"
  | "sound"
  | "smell"
  | "body"
  | "emotion"
  | "proof"
  | "declaration";

export interface VisionEmbodimentResponses {
  where: string;
  temperature: string;
  light: string;
  sound: string;
  smell: string;
  body: string;
  emotion: string;
  proof: string;
  declaration: string;
}

export interface VisionEmbodimentStepDef {
  key: VisionEmbodimentKey;
  title: string;
  psychology: string;
  prompt: string;
  placeholder: string;
  rows: number;
}

export const VISION_EMBODIMENT_INTRO = {
  title: "Step into it — you already have it",
  body:
    "Elite performers and clinical imagery research use the same pattern: vivid, multisensory, present-tense scenes train your nervous system to treat the future as familiar — not fantasy. Walk through the room as if you're there now.",
};

export const VISION_EMBODIMENT_STEPS: readonly VisionEmbodimentStepDef[] = [
  {
    key: "where",
    title: "Where are you?",
    psychology: "Spatial anchoring — the brain maps identity to place before numbers.",
    prompt: "What room, city, or moment is this? Look around — what's in front of you?",
    placeholder: "I'm in my home office. The house is quiet. Lilly is down the hall…",
    rows: 3,
  },
  {
    key: "temperature",
    title: "Temperature & air",
    psychology: "Interoceptive detail makes imagery feel real to the body, not just the mind.",
    prompt: "What do you feel on your skin? The air in the room? A drink in your hand?",
    placeholder: "Cool AC, warm mug, cotton shirt, rested shoulders…",
    rows: 2,
  },
  {
    key: "light",
    title: "Light",
    psychology: "Lighting shifts mood and certainty — bright clarity vs. soft peace.",
    prompt: "Morning sun through windows? Screens? Candlelight? What quality of light?",
    placeholder: "Golden morning through clean windows. Everything feels visible and ordered.",
    rows: 2,
  },
  {
    key: "sound",
    title: "Sound",
    psychology: "Auditory cues lock memory — silence can mean safety as much as noise means life.",
    prompt: "What do you hear — or the relief of what you don't hear anymore?",
    placeholder: "HVAC hum, birds outside, no panic notifications on my phone…",
    rows: 2,
  },
  {
    key: "smell",
    title: "Smell",
    psychology: "Scent bypasses analysis and lands in emotion — the fastest path to 'I'm home.'",
    prompt: "Coffee, clean laundry, rain, leather, dinner cooking — what is in the air?",
    placeholder: "Fresh coffee and a clean house that smells put-together…",
    rows: 2,
  },
  {
    key: "body",
    title: "How your body feels",
    psychology: "Somatic markers tell the subconscious the scene is safe enough to inhabit.",
    prompt: "Posture, breath, weight on your chest, pace of your heart — present tense.",
    placeholder: "Chest open. Breath slow. No clench in my jaw. I stand tall.",
    rows: 3,
  },
  {
    key: "emotion",
    title: "Emotion",
    psychology: "Name the feeling you want your system to recognize as normal — not peak hype.",
    prompt: "Not manic excitement — the steady feeling of a man who belongs here.",
    placeholder: "Quiet confidence. Gratitude. Peace that doesn't need to prove anything.",
    rows: 2,
  },
  {
    key: "proof",
    title: "One proof it's real",
    psychology: "Specific evidence bridges imagination and belief — one concrete detail.",
    prompt: "A number, a view, a person's face, an account, a room finished — one tell.",
    placeholder: "The dashboard is green. The mortgage payment is a line item, not a crisis.",
    rows: 2,
  },
  {
    key: "declaration",
    title: "I am already here",
    psychology: "Present-tense identity statements consolidate the scene into who you are now.",
    prompt: "Write 2–4 sentences in present tense — as if this is Tuesday morning today.",
    placeholder: "I wake up in a home that is put together. Revenue runs without me grinding…",
    rows: 5,
  },
] as const;

export function emptyVisionEmbodimentResponses(): VisionEmbodimentResponses {
  return {
    where: "",
    temperature: "",
    light: "",
    sound: "",
    smell: "",
    body: "",
    emotion: "",
    proof: "",
    declaration: "",
  };
}

const SECTION_LABELS: Record<VisionEmbodimentKey, string> = {
  where: "Where I am",
  temperature: "Temperature & air",
  light: "Light",
  sound: "Sound",
  smell: "Smell",
  body: "How my body feels",
  emotion: "Emotion",
  proof: "Proof it's real",
  declaration: "I am already here",
};

export function composeVisionEmbodiment(
  workbook: LivingHopeWorkbookContent | null,
  responses: VisionEmbodimentResponses,
): string {
  const parts: string[] = [];

  if (workbook?.vision_headline?.trim()) {
    parts.push(`**Vision:** ${workbook.vision_headline.trim()}`);
  }
  if (workbook?.income_total_label?.trim()) {
    parts.push(`**Structure:** ${workbook.income_total_label.trim()}`);
  }

  for (const step of VISION_EMBODIMENT_STEPS) {
    const text = responses[step.key].trim();
    if (text) parts.push(`**${SECTION_LABELS[step.key]}:** ${text}`);
  }

  return parts.join("\n\n");
}

const PARSE_RE =
  /^\*\*(Where I am|Temperature & air|Light|Sound|Smell|How my body feels|Emotion|Proof it's real|I am already here|Vision|Structure):\*\*\s*([\s\S]*?)(?=\n\n\*\*|$)/gm;

const LABEL_TO_KEY: Record<string, VisionEmbodimentKey> = {
  "Where I am": "where",
  "Temperature & air": "temperature",
  Light: "light",
  Sound: "sound",
  Smell: "smell",
  "How my body feels": "body",
  Emotion: "emotion",
  "Proof it's real": "proof",
  "I am already here": "declaration",
};

/** Best-effort parse of a prior embodiment note back into fields. */
export function parseVisionEmbodiment(raw: string): VisionEmbodimentResponses {
  const base = emptyVisionEmbodimentResponses();
  if (!raw.trim()) return base;

  let match: RegExpExecArray | null;
  PARSE_RE.lastIndex = 0;
  while ((match = PARSE_RE.exec(raw)) !== null) {
    const key = LABEL_TO_KEY[match[1]];
    if (key) base[key] = match[2].trim();
  }

  if (!Object.values(base).some((v) => v.trim())) {
    base.declaration = raw.trim();
  }

  return base;
}

export function visionEmbodimentProgress(responses: VisionEmbodimentResponses): number {
  const filled = VISION_EMBODIMENT_STEPS.filter((s) => responses[s.key].trim()).length;
  return filled / VISION_EMBODIMENT_STEPS.length;
}
