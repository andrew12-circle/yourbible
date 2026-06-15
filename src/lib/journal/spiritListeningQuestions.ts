/** Curated Holy Spirit questions for Journal → Listening entries. */

export interface SpiritListeningQuestionCategory {
  id: string;
  label: string;
  questions: string[];
}

export const SPIRIT_LISTENING_QUESTION_BANK: readonly SpiritListeningQuestionCategory[] = [
  {
    id: "presence",
    label: "God & presence",
    questions: [
      "Who are You to me today?",
      "What do You want me to know about Your heart right now?",
      "What are You proud of in me — even if I can't see it?",
      "Where have You been faithful that I haven't thanked You for?",
      "What would it look like to rest in You for the next hour?",
    ],
  },
  {
    id: "direction",
    label: "Direction & timing",
    questions: [
      "What is the one faithful thing You want from me today?",
      "What am I rushing that You haven't authorized?",
      "What should I wait on — and what should I move on now?",
      "What decision am I avoiding that You want me to face?",
      "If I only obey one thing today, what is it?",
      "What season am I in — and what does obedience look like here?",
    ],
  },
  {
    id: "family",
    label: "Family",
    questions: [
      "How do You want me to lead Tish and Lilly today?",
      "What does the new baby need from me spiritually?",
      "Where does my family need my presence more than my productivity?",
      "What do I need to apologize for or repair at home?",
      "How can I love my wife in a way that actually lands today?",
      "What legacy am I building in our home — and what needs to change?",
    ],
  },
  {
    id: "business",
    label: "Business & provision",
    questions: [
      "What should I build this week — and what should I release?",
      "Where is fear driving my business decisions?",
      "What system or bottleneck matters most right now?",
      "Am I building for Your glory or my security?",
      "Who do You want me to serve or call today?",
      "What provision are You inviting me to trust You for?",
    ],
  },
  {
    id: "discernment",
    label: "Discernment",
    questions: [
      "Is this You, my flesh, or the enemy?",
      "What would love do here?",
      "What am I avoiding that You're inviting me into?",
      "What impression keeps returning — and is it from You?",
      "What am I clinging to that You want me to open my hands about?",
    ],
  },
  {
    id: "obedience",
    label: "Obedience & scripture",
    questions: [
      "What should I obey today even if I don't understand?",
      "What verse should I hold today?",
      "What have You already told me that I haven't acted on?",
      "What does repentance look like for me right now?",
      "What truth do I need to speak — to myself or someone else?",
    ],
  },
  {
    id: "inner-life",
    label: "Inner life & healing",
    questions: [
      "What weight am I carrying that You want to lift?",
      "What lie am I believing?",
      "What do You see in me that I can't see yet?",
      "Where do I need Your peace instead of my striving?",
    ],
  },
  {
    id: "warfare",
    label: "Covering & warfare",
    questions: [
      "What needs the blood of Jesus over it today?",
      "What should I rebuke — and what should I surrender?",
      "What assignment of darkness is active against my family or work?",
      "What do You want me to declare aloud in Your name?",
    ],
  },
] as const;

export const SPIRIT_LISTENING_CUSTOM_QUESTIONS_KEY = "journal.spiritListening.customQuestions";

const ASKED_PREFIX = "Asked:";

export function formatAskedQuestionLine(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) return "";
  return `${ASKED_PREFIX} ${trimmed}`;
}

/** Merge a new asked question into the Thought section (prepend or append). */
export function mergeAskedQuestionIntoThought(thought: string, question: string): string {
  const line = formatAskedQuestionLine(question);
  if (!line) return thought;
  const existing = thought.trim();
  if (!existing) return line;
  if (existing.includes(line)) return existing;
  return `${line}\n\n${existing}`;
}

export function loadCustomSpiritQuestions(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPIRIT_LISTENING_CUSTOM_QUESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((q) => String(q).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveCustomSpiritQuestions(questions: string[]): void {
  if (typeof localStorage === "undefined") return;
  const cleaned = questions.map((q) => q.trim()).filter(Boolean);
  localStorage.setItem(SPIRIT_LISTENING_CUSTOM_QUESTIONS_KEY, JSON.stringify(cleaned));
}
