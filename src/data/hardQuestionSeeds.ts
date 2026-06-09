import type { FrameworkLayer } from "@/data/framework";

export type HardQuestionSeed = {
  key: string;
  title: string;
  framing: string;
  whyItMatters: string;
  layer?: FrameworkLayer;
  tags: string[];
  scriptureRefs: { ref: string; role: "supports" | "challenges" | "context" }[];
};

export const HARD_QUESTION_SEEDS: HardQuestionSeed[] = [
  {
    key: "dinosaurs-dragons",
    title: "Why doesn't the Bible mention dinosaurs, even though it mentions dragons?",
    framing:
      "Explain this to someone with no modern science vocabulary — as if speaking to a Neanderthal who knows fire, animals, and stories but not geology or paleontology.",
    whyItMatters:
      "Skeptics use this as a quick attack on biblical reliability. I want an honest answer that respects Scripture, ancient language, and what we know from science.",
    tags: ["scripture", "creation", "science"],
    scriptureRefs: [
      { ref: "Genesis 1", role: "context" },
      { ref: "Job 40:15-24", role: "context" },
      { ref: "Job 41", role: "context" },
      { ref: "Isaiah 27:1", role: "context" },
    ],
  },
  {
    key: "good-people-suffer",
    title: "Why do bad things happen to good people?",
    framing:
      "Address the hardest objections honestly — not a bumper-sticker answer. Include what Job, Jesus, and modern sufferers actually experience.",
    whyItMatters:
      "This is the question that has shaken my faith most. I need a conclusion I can stand on when prayer goes unanswered and the righteous still hurt.",
    layer: "life",
    tags: ["suffering", "theodicy", "prayer"],
    scriptureRefs: [
      { ref: "Job 1", role: "context" },
      { ref: "John 9:1-3", role: "context" },
      { ref: "Romans 8:28", role: "supports" },
      { ref: "Romans 8:18", role: "context" },
    ],
  },
];

export function getHardQuestionSeed(key: string): HardQuestionSeed | undefined {
  return HARD_QUESTION_SEEDS.find((s) => s.key === key);
}
