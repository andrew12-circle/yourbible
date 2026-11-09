export type BeStillStage = "prepare" | "stillness" | "question" | "picture" | "listen" | "reflect";
export type BeStillOutcome = "open" | "noted" | "nothing-clear";
export type BeStillEntryPoint = "prayer" | "morning";
export type BeStillPictureKind = "person" | "choice" | "situation";
export type BeStillThoughtOrigin = "arrived" | "reasoned" | "uncertain" | "none";
export type BeStillVerification = "pending" | "confirmed" | "not-confirmed" | "inconclusive";

export type BeStillQualities = {
  whole: boolean;
  calm: boolean;
  notFlattering: boolean;
  challengedWishes: boolean;
  asksSomething: boolean;
};

export interface BeStillSession {
  version: 1;
  id: string;
  entryPoint: BeStillEntryPoint;
  startedAt: string;
  completedAt: string | null;
  stage: BeStillStage;
  place: string;
  hour: string;
  handsEmpty: boolean;
  interruptionsCleared: boolean;
  dayPutAway: boolean;
  question: string;
  pictureKind: BeStillPictureKind;
  picture: string;
  reflection: string;
  thoughtOrigin: BeStillThoughtOrigin;
  qualities: BeStillQualities;
  scripture: string;
  nextStep: string;
  reviewDate: string;
  outcome: BeStillOutcome;
  verification: BeStillVerification;
  verificationNotes: string;
  verifiedAt: string | null;
}

export const BE_STILL_STAGES = [
  { id: "stillness", label: "Be still", hint: "Put the day away." },
  { id: "question", label: "One question", hint: "Keep one sentence in mind." },
  { id: "picture", label: "See the question", hint: "See the person or both roads." },
  { id: "listen", label: "Release it", hint: "Wait without forcing." },
] as const;

const STAGES: readonly BeStillStage[] = ["prepare", ...BE_STILL_STAGES.map((step) => step.id), "reflect"];
const OUTCOMES: readonly BeStillOutcome[] = ["open", "noted", "nothing-clear"];
const ORIGINS: readonly BeStillThoughtOrigin[] = ["arrived", "reasoned", "uncertain", "none"];
const PICTURES: readonly BeStillPictureKind[] = ["person", "choice", "situation"];
const VERIFICATIONS: readonly BeStillVerification[] = ["pending", "confirmed", "not-confirmed", "inconclusive"];
const MARKER = /<!-- be-still-session:v1:([^\r\n]*?) -->/;
const LEDGER_BLOCK = /\n*<!-- be-still-ledger:start -->[\s\S]*?<!-- be-still-ledger:end -->/;

const emptyQualities = (): BeStillQualities => ({
  whole: false, calm: false, notFlattering: false, challengedWishes: false, asksSomething: false,
});

export function createBeStillSession(entryPoint: BeStillEntryPoint): BeStillSession {
  return {
    version: 1, id: crypto.randomUUID(), entryPoint, startedAt: new Date().toISOString(),
    completedAt: null, stage: "prepare", place: "", hour: "", handsEmpty: false,
    interruptionsCleared: false, dayPutAway: false,
    question: "", pictureKind: "situation", picture: "", reflection: "",
    thoughtOrigin: "uncertain", qualities: emptyQualities(), scripture: "", nextStep: "",
    reviewDate: "", outcome: "open", verification: "pending", verificationNotes: "", verifiedAt: null,
  };
}

/** The question must be written before the quiet period as one clear sentence. */
export function isOneSentenceQuestion(question: string): boolean {
  const value = question.trim();
  if (!value || value.length > 300 || /[\r\n]/.test(value)) return false;
  const withoutFinalPunctuation = value.replace(/[.!?]+["'”’)]?$/, "");
  return !/[.!?]\s+\S/.test(withoutFinalPunctuation) && !/[!?]/.test(withoutFinalPunctuation);
}

export function readyForStillness(session: BeStillSession): boolean {
  return isOneSentenceQuestion(session.question) && Boolean(session.place.trim()) &&
    /^\d{2}:\d{2}$/.test(session.hour) && session.handsEmpty &&
    session.interruptionsCleared && session.dayPutAway;
}

/** Preserve typed text without activating the journal's older listening-entry parser. */
function journalText(value: string): string {
  return value.trim().replace(/^##\s+(Thought|Words|Plan|Interpretation)\s*$/gim, "\\## $1");
}

function markerFor(session: BeStillSession): string {
  return "<!-- be-still-session:v1:" + encodeURIComponent(JSON.stringify(session)) + " -->";
}

export function serializeBeStillSession(session: BeStillSession): string {
  const qualityLabels: Record<keyof BeStillQualities, string> = {
    whole: "It arrived complete", calm: "It came calmly", notFlattering: "It did not seem designed to please me",
    challengedWishes: "It challenged what I wanted", asksSomething: "It asked something of me",
  };
  const originLabels: Record<BeStillThoughtOrigin, string> = {
    arrived: "Arrived whole", reasoned: "Built through deliberate reasoning",
    uncertain: "Uncertain how it emerged", none: "No clear thought",
  };
  const qualities = (Object.keys(qualityLabels) as (keyof BeStillQualities)[])
    .filter((key) => session.qualities[key]).map((key) => "- " + qualityLabels[key]);
  const sections = [
    "# On Receiving · Be Still",
    "Listening practice · " + new Date(session.startedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    ...(session.place.trim() ? ["## Place and hour\n\n" + journalText(session.place) + " · " + session.hour] : []),
    "## My one question\n\n" + (journalText(session.question) || "No question recorded."),
    ...(session.picture.trim() ? ["## What I saw\n\n" + journalText(session.picture)] : []),
    "## Origin of the thought\n\n" + originLabels[session.thoughtOrigin],
    "## What I noticed\n\n" + (journalText(session.reflection) || (session.outcome === "nothing-clear"
      ? "Nothing clear came to mind today." : "I sat quietly and released my question.")),
    ...(qualities.length ? ["## Qualities I noticed\n\n" + qualities.join("\n")] : []),
    ...(session.scripture.trim() ? ["## Scripture to revisit\n\n" + journalText(session.scripture)] : []),
    ...(session.nextStep.trim() ? ["## My next step\n\n" + journalText(session.nextStep)] : []),
    ...(session.reviewDate ? ["## Date to revisit\n\n" + session.reviewDate] : []),
    "## Later reflection\n\nReturn to compare this observation with what actually happened.",
    markerFor(session),
  ];
  return sections.join("\n\n") + "\n";
}

/** Read both new sessions and the original PR's version-1 saved sessions. */
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
    if (row.completedAt !== null && (typeof row.completedAt !== "string" || !Number.isFinite(Date.parse(row.completedAt as string)))) return null;
    if (row.reviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.reviewDate as string)) return null;
    const qualities = row.qualities;
    if (qualities !== undefined && (!qualities || typeof qualities !== "object" || Array.isArray(qualities) ||
      Object.keys(emptyQualities()).some((key) => typeof (qualities as Record<string, unknown>)[key] !== "boolean"))) return null;
    if (row.place !== undefined && typeof row.place !== "string") return null;
    if (row.hour !== undefined && (typeof row.hour !== "string" || (row.hour !== "" && !/^\d{2}:\d{2}$/.test(row.hour)))) return null;
    for (const key of ["handsEmpty", "interruptionsCleared", "dayPutAway"]) if (row[key] !== undefined && typeof row[key] !== "boolean") return null;
    for (const key of ["verificationNotes"]) if (row[key] !== undefined && typeof row[key] !== "string") return null;
    if (row.verifiedAt !== undefined && row.verifiedAt !== null && (typeof row.verifiedAt !== "string" || !Number.isFinite(Date.parse(row.verifiedAt as string)))) return null;
    if (row.pictureKind !== undefined && !PICTURES.includes(row.pictureKind as BeStillPictureKind)) return null;
    if (row.thoughtOrigin !== undefined && !ORIGINS.includes(row.thoughtOrigin as BeStillThoughtOrigin)) return null;
    if (row.verification !== undefined && !VERIFICATIONS.includes(row.verification as BeStillVerification)) return null;
    const old = row as unknown as BeStillSession;
    const legacyOrigin: BeStillThoughtOrigin = old.outcome === "nothing-clear" ? "none" : "uncertain";
    return {
      ...old,
      place: typeof row.place === "string" ? row.place : "",
      hour: typeof row.hour === "string" ? row.hour : "",
      handsEmpty: row.handsEmpty === true,
      interruptionsCleared: row.interruptionsCleared === true,
      dayPutAway: row.dayPutAway === true,
      pictureKind: (row.pictureKind as BeStillPictureKind | undefined) ?? "situation",
      thoughtOrigin: (row.thoughtOrigin as BeStillThoughtOrigin | undefined) ?? legacyOrigin,
      qualities: (qualities as BeStillQualities | undefined) ?? emptyQualities(),
      verification: (row.verification as BeStillVerification | undefined) ?? "pending",
      verificationNotes: (row.verificationNotes as string | undefined) ?? "",
      verifiedAt: (row.verifiedAt as string | null | undefined) ?? null,
    };
  } catch { return null; }
}

/** Update only the versioned marker and our own ledger section, preserving later user journal edits. */
export function withBeStillVerification(body: string, verification: BeStillVerification, notes: string, now: string): string {
  const old = parseBeStillSession(body);
  if (!old || !old.completedAt) throw new Error("Only a completed Be Still session can be reviewed.");
  if (!VERIFICATIONS.includes(verification)) throw new Error("Invalid verification status.");
  const next: BeStillSession = { ...old, verification, verificationNotes: notes, verifiedAt: now };
  const updated = body.replace(MARKER, markerFor(next)).replace(LEDGER_BLOCK, "").trimEnd();
  return updated + "\n\n<!-- be-still-ledger:start -->\n## Ledger review\n\n" +
    "Outcome: " + verification + "\n\n" + (journalText(notes) || "No supporting notes recorded.") +
    "\n\nReviewed: " + now + "\n<!-- be-still-ledger:end -->\n";
}
