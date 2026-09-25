/** Faith-grounded mental rehearsal. No outcome predictions or AI/TTS requests. */
export interface RehearsalScene { id: string; title?: string; text: string }
export type RehearsalFocus = "all" | "faith" | "family" | "home" | "provision" | "future";
export type RehearsalVariant = "process" | "recovery" | "perspective";
export type RehearsalMinutes = 3 | 5 | 10 | 15;
export interface RehearsalVisit { sceneId: string; day: string; variant: RehearsalVariant; minutes: RehearsalMinutes }
export interface RehearsalBeat { key: string; title: string; text: string; seconds: number }
export interface RehearsalNote {
  sceneId: string; title: string; identity: string; obstacle: string; response: string;
  action: string; when: string; completed: boolean;
}
export const REHEARSAL_SCRIPT_LIMIT = 4750;
export const REHEARSAL_FOCUSES: { value: RehearsalFocus; label: string }[] = [
  { value: "all", label: "All areas" }, { value: "faith", label: "Faith" },
  { value: "family", label: "Family" }, { value: "home", label: "Home" },
  { value: "provision", label: "Provision / work" }, { value: "future", label: "Future self" },
];
export const REHEARSAL_VARIANTS: { value: RehearsalVariant; label: string }[] = [
  { value: "process", label: "Practice the steps" },
  { value: "recovery", label: "Practice a recovery" },
  { value: "perspective", label: "Practice who you are becoming" },
];
export const OPEN_HANDED_PRAYER = "God, I desire this. If it is from You, establish it. If it is not, change the picture and redirect my desires. I release the timing, the method, and the outcome. Show me what faithfulness looks like today.";
const protectedTitles = new Set(["ace is working", "the house is put together"]);
export function isProtectedRehearsalScene(scene: RehearsalScene): boolean {
  return scene.id === "ace" || scene.id === "a81e37b7-37e2-42da-924c-0837868cea2f"
    || protectedTitles.has((scene.title ?? "").trim().toLowerCase().replace(/\s+/g, " "));
}
export function sceneFocus(scene: RehearsalScene): RehearsalFocus {
  const title = (scene.title ?? "").toLowerCase();
  if (/ten years|future|older|legacy/.test(title)) return "future";
  if (/prayer|altared|ledger|worship/.test(title)) return "faith";
  if (/borrower|family we helped|client|financial|generosity|business/.test(title)) return "provision";
  if (/dad|marriage|dinner|family/.test(title)) return "family";
  if (/house|morning|home|saturday/.test(title)) return "home";
  return "provision";
}
export function rehearsalDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dayNumber(day: string): number { return Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000) || 0; }
export function dailyRehearsalVariant(day: string): RehearsalVariant {
  return (["process", "recovery", "perspective"] as const)[((dayNumber(day) % 3) + 3) % 3];
}
export function suggestRehearsalScene(
  scenes: readonly RehearsalScene[], focus: RehearsalFocus, history: readonly RehearsalVisit[], day: string,
): RehearsalScene | null {
  const eligible = scenes.filter((s) => s.text.trim());
  const focused = focus === "all" ? eligible : eligible.filter((s) => sceneFocus(s) === focus);
  const pool = focused.length ? focused : eligible;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  if (!sorted.length) return null;
  const offset = ((dayNumber(day) % sorted.length) + sorted.length) % sorted.length;
  const rotated = [...sorted.slice(offset), ...sorted.slice(0, offset)];
  const lastVisit = (id: string) => history.filter((v) => v.sceneId === id).reduce((last, v) => Math.max(last, dayNumber(v.day)), -1);
  return rotated.reduce((best, scene) => lastVisit(scene.id) < lastVisit(best.id) ? scene : best);
}
export function deepRehearsalDue(history: readonly RehearsalVisit[], day: string): boolean {
  return !history.some((v) => v.minutes >= 10 && dayNumber(day) - dayNumber(v.day) >= 0 && dayNumber(day) - dayNumber(v.day) < 7);
}
export function readRehearsalHistory(raw: string | null): RehearsalVisit[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is RehearsalVisit => Boolean(v && typeof v === "object"
      && typeof v.sceneId === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.day)
      && Number.isFinite(Date.parse(`${v.day}T12:00:00Z`))
      && ["process", "recovery", "perspective"].includes(v.variant)
      && [3, 5, 10, 15].includes(v.minutes))).slice(-90);
  } catch { return []; }
}
export function recordRehearsalVisit(history: readonly RehearsalVisit[], visit: RehearsalVisit): RehearsalVisit[] {
  return [...history.filter((v) => !(v.sceneId === visit.sceneId && v.day === visit.day
    && v.variant === visit.variant && v.minutes === visit.minutes)), visit].slice(-90);
}
function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const partial = clean.slice(0, max - 1);
  const end = Math.max(partial.lastIndexOf(". "), partial.lastIndexOf("? "), partial.lastIndexOf("! "));
  return end > max / 2 ? partial.slice(0, end + 1) : `${partial.slice(0, partial.lastIndexOf(" "))}…`;
}
/** Timing is practice pacing, never a deadline or prediction for the desired outcome. */
export function buildRehearsalBeats(scene: RehearsalScene, minutes: RehearsalMinutes, variant: RehearsalVariant): RehearsalBeat[] {
  const deep = minutes >= 10;
  const all = [
    { key: "arrive", title: "Arrive", weight: 1, text: "Put on headphones if you have them. Sit somewhere safe, not while driving. Let your body settle. Close your eyes if that helps, or keep them open. You are rehearsing a possible life, not demanding an outcome." },
    { key: "embody", title: "Enter the scene", weight: 1, text: "Step into this moment in first person. Where are you? What time of day is it? What happened just before this? Notice your posture, your hands, the chair or floor, and the space around you." },
    { key: "enter", title: "See it", weight: 4, text: `Look through your own eyes. Let the scene become specific instead of abstract. Notice the room, the people, the light, and what you are doing next. ${excerpt(scene.text, deep ? 1200 : 650)}` },
    { key: "sense", title: "Hear and feel it", weight: 2, text: "Listen for nearby sounds and voices. Notice the temperature, clothing, surfaces, and one familiar smell if it comes naturally. You do not need a perfect mental picture; words, sounds, and felt details count." },
    { key: "inhabit", title: "Live it", weight: 2, text: "Let several ordinary seconds unfold at normal speed. Move through the moment instead of watching a highlight reel. Notice how you speak, listen, work, lead, rest, and treat the people around you." },
    { key: "feel", title: "Feel the result", weight: 2, text: "Let the meaning of this life land: gratitude, peace, provision, service, closeness, confidence, or rest. Do not force emotion. Notice what matters most about this scene and why you want to live this way." },
    { key: "rehearse", title: "Rehearse reality", weight: 3, text: "Now rehearse the behavior that helps create this life. See yourself beginning the real work, making a good decision, staying present, and finishing the next useful step. Practice the process, not just the outcome." },
    { key: "overcome", title: "Handle resistance", weight: 3, text: "Introduce one realistic obstacle: distraction, pressure, fatigue, fear, delay, or a hard conversation. See yourself respond well. If this happens, what will you do next instead of falling back into the old pattern?" },
    { key: "observe", title: "Become it", weight: 2, text: "Notice the qualities of the person living this scene: patience, discipline, courage, generosity, calm, honesty, focus. Pick one quality you can practice today, then return to first person and act from it." },
    { key: "surrender", title: "Surrender it", weight: 2, text: OPEN_HANDED_PRAYER },
    { key: "act", title: "Return to today", weight: 2, text: "Come back to the room you are actually in. Feel the chair and floor. Ask one question: What does the man you just saw do today? Choose one specific action you control and carry it into the next step." },
  ];
  const chosen = deep ? all : [
    { ...all[0], title: "Arrive and embody", text: `${all[0].text} ${all[1].text}` },
    { ...all[2], title: "Enter and sense", text: `${all[2].text} ${all[3].text}` },
    { ...all[5], title: "Inhabit and feel", text: `${all[4].text} ${all[5].text}` },
    all[variant === "process" ? 6 : variant === "recovery" ? 7 : 8], all[9], all[10],
  ];
  const weight = chosen.reduce((sum, b) => sum + b.weight, 0);
  let assigned = 0;
  return chosen.map((beat, i) => {
    const seconds = i === chosen.length - 1 ? minutes * 60 - assigned : Math.floor(minutes * 60 * beat.weight / weight);
    assigned += seconds;
    return { key: beat.key, title: beat.title, text: beat.text, seconds };
  });
}
export function rehearsalNarration(beats: readonly RehearsalBeat[]): string {
  const text = beats.map((b) => b.text).join("\n\n");
  if (text.length > REHEARSAL_SCRIPT_LIMIT) throw new Error("Guided script exceeds 4,750 characters.");
  return text;
}
const START = "<!-- scene-rehearsal:v1 -->";
const END = "<!-- /scene-rehearsal -->";
const BLOCK = /<!-- scene-rehearsal:v1 -->[\s\S]*?<!-- \/scene-rehearsal -->/g;
export const emptyRehearsalNote = (): RehearsalNote => ({ sceneId: "", title: "", identity: "", obstacle: "", response: "", action: "", when: "", completed: false });
const fields = { sceneId: "Scene ID", title: "Scene", identity: "Identity to practice", obstacle: "If", response: "Then", action: "Today's action", when: "Start cue / time" } as const;
export function parseRehearsalNote(raw: string): RehearsalNote {
  const note = emptyRehearsalNote();
  const block = raw.match(BLOCK)?.[0];
  if (!block) return note;
  for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
    const prefix = `**${fields[key]}:** `;
    const line = block.split("\n").find((l) => l.startsWith(prefix));
    note[key] = line?.slice(prefix.length).trim() ?? "";
  }
  note.completed = block.includes("**Practice status:** Completed");
  return note;
}
export function withoutRehearsalNote(raw: string): string { return raw.replace(BLOCK, "").trim(); }
export function writeRehearsalNote(raw: string, note: RehearsalNote): string {
  const clean = (v: string) => v.replace(/<!--|-->/g, "").replace(/\s+/g, " ").trim();
  const lines = (Object.keys(fields) as (keyof typeof fields)[]).map((key) => `**${fields[key]}:** ${clean(note[key])}`);
  const block = [START, "**Scene rehearsal**", ...lines, `**Practice status:** ${note.completed ? "Completed" : "In progress"}`, "**Surrender:** Outcome and timing held open-handed before God.", END].join("\n");
  return [withoutRehearsalNote(raw), block].filter(Boolean).join("\n\n");
}
export function rehearsalAction(visionRecall: string, storyRecall = ""): string {
  const a = parseRehearsalNote(visionRecall), b = parseRehearsalNote(storyRecall);
  const note = b.action ? b : a;
  return note.action ? `${note.action}${note.when ? ` — ${note.when}` : ""}` : "";
}
