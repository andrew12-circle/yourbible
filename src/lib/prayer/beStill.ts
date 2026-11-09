export type BeStillStage = "stillness" | "question" | "picture" | "listen" | "reflect";
export type BeStillOutcome = "open" | "noted" | "nothing-clear";
export type BeStillEntryPoint = "prayer" | "morning";

export interface BeStillSession {
  version: 1;
  id: string;
  entryPoint: BeStillEntryPoint;
  startedAt: string;
  completedAt: string | null;
  stage: BeStillStage;
  question: string;
  picture: string;
  reflection: string;
  scripture: string;
  nextStep: string;
  reviewDate: string;
  outcome: BeStillOutcome;
}

export const BE_STILL_STAGES = [
  { id: "stillness", label: "Be still", hint: "Make room for quiet." },
  { id: "question", label: "One question", hint: "Bring what matters." },
  { id: "picture", label: "See it clearly", hint: "Hold it gently in mind." },
  { id: "listen", label: "Release & listen", hint: "Let go of the effort." },
] as const;

const STAGES: readonly BeStillStage[] = [...BE_STILL_STAGES.map((step) => step.id), "reflect"];
const OUTCOMES: readonly BeStillOutcome[] = ["open", "noted", "nothing-clear"];
const MARKER = /<!-- be-still-session:v1:([^\r\n]*?) -->/;

export function createBeStillSession(entryPoint: BeStillEntryPoint): BeStillSession {
  return {
    version: 1, id: crypto.randomUUID(), entryPoint, startedAt: new Date().toISOString(),
    completedAt: null, stage: "stillness", question: "", picture: "", reflection: "",
    scripture: "", nextStep: "", reviewDate: "", outcome: "open",
  };
}

/** Preserve typed text without activating the journal's older listening-entry parser. */
function journalText(value: string): string {
  return value.trim().replace(/^##\s+(Thought|Words|Plan|Interpretation)\s*$/gim, "\\## $1");
}

/** Recovery metadata shares the body's existing encryption and never goes in browser pointers or tags. */
export function serializeBeStillSession(session: BeStillSession): string {
  const sections = [
    "# Be Still",
    `Listening prayer · ${new Date(session.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
    "## My question\n\n" + (journalText(session.question) || "I brought my concern in quiet prayer."),
    ...(session.picture.trim() ? ["## What I brought into prayer\n\n" + journalText(session.picture)] : []),
    "## What I noticed\n\n" + (journalText(session.reflection) || (session.outcome === "nothing-clear"
      ? "Nothing clear came to mind today. I made time to be still."
      : "I spent time in quiet prayer.")),
    ...(session.scripture.trim() ? ["## Scripture to revisit\n\n" + journalText(session.scripture)] : []),
    ...(session.nextStep.trim() ? ["## My next step\n\n" + journalText(session.nextStep)] : []),
    ...(session.reviewDate ? ["## Date to revisit\n\n" + session.reviewDate] : []),
    "## Later reflection\n\nReturn here to add what Scripture, time, circumstances, or trusted counsel help you understand.",
    `<!-- be-still-session:v1:${encodeURIComponent(JSON.stringify(session))} -->`,
  ];
  return sections.join("\n\n") + "\n";
}

/** Unrecognized or damaged drafts are never replaced with a blank session. */
export function parseBeStillSession(body: string): BeStillSession | null {
  try {
    const encoded = MARKER.exec(body)?.[1];
    if (!encoded) return null;
    const value: unknown = JSON.parse(decodeURIComponent(encoded));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    if (row.version !== 1 || typeof row.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id) ||
      !["prayer", "morning"].includes(String(row.entryPoint)) ||
      !STAGES.includes(row.stage as BeStillStage) || !OUTCOMES.includes(row.outcome as BeStillOutcome)) return null;
    for (const key of ["startedAt", "question", "picture", "reflection", "scripture", "nextStep", "reviewDate"]) {
      if (typeof row[key] !== "string") return null;
    }
    if (!Number.isFinite(Date.parse(row.startedAt as string))) return null;
    if (row.completedAt !== null && (typeof row.completedAt !== "string" || !Number.isFinite(Date.parse(row.completedAt)))) return null;
    if (row.reviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewDate as string)) return null;
    return row as unknown as BeStillSession;
  } catch {
    return null;
  }
}
