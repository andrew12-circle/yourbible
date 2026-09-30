import { parseTonguesMinutes, parseWorshipMode, parseWorshipPrayerTimer, worshipPrayerRemaining, type WorshipMode, type WorshipPrayerTimer } from "./morningWorshipPrayer";

/** Personal material, deliberately separate from imagined future scenes. */
export interface MorningFoundation {
  theme: string;
  motto: string;
  question: string;
  hopePrayer: string;
  worshipMode?: WorshipMode;
  tonguesMinutes?: number;
  angelPrayer?: string;
  angelRecordingPath?: string;
}

export interface MorningMemory {
  id: string;
  kind: "real_memory";
  title: string;
  body: string;
  happenedOn: string;
  photoPath: string;
  audioPath: string;
  sceneId: string;
}

/** Snapshot for this morning. Later foundation edits never rewrite this record. */
export interface MorningFoundationSession extends MorningFoundation {
  initialized: boolean;
  answer: string;
  memory: MorningMemory | null;
  memoryReflection: string;
  sceneId: string;
  sceneTitle: string;
  action: string;
  worshipPrayer?: WorshipPrayerTimer;
  angelsPrayed?: boolean;
}

export const SUGGESTED_HOPE_PRAYER = "Father, help me appreciate what You have already given me without pretending I do not have real needs. Let me ask honestly, work faithfully, and remain open to Your direction. Do not let my desire for tomorrow keep me from loving the people in front of me today.";

const text = (value: unknown): string => typeof value === "string" ? value : "";
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function emptyMorningFoundation(): MorningFoundation {
  return { theme: "", motto: "", question: "", hopePrayer: "", worshipMode: "both", tonguesMinutes: 5, angelPrayer: "", angelRecordingPath: "" };
}

export function parseMorningFoundation(value: unknown): MorningFoundation {
  const raw = record(value);
  return { theme: text(raw.theme), motto: text(raw.motto), question: text(raw.question), hopePrayer: text(raw.hopePrayer), worshipMode: parseWorshipMode(raw.worshipMode), tonguesMinutes: parseTonguesMinutes(raw.tonguesMinutes), angelPrayer: text(raw.angelPrayer), angelRecordingPath: text(raw.angelRecordingPath) };
}

export function parseMorningMemory(value: unknown): MorningMemory | null {
  const raw = record(value);
  // Never import a WorkbookStory as a testimony, or seed a claimed event.
  if (raw.kind !== "real_memory" || !text(raw.id).trim() || !text(raw.title).trim()) return null;
  if (!text(raw.body).trim() && !text(raw.photoPath) && !text(raw.audioPath)) return null;
  return {
    id: text(raw.id), kind: "real_memory", title: text(raw.title), body: text(raw.body),
    happenedOn: text(raw.happenedOn), photoPath: text(raw.photoPath), audioPath: text(raw.audioPath), sceneId: text(raw.sceneId),
  };
}

export function parseMorningMemories(value: unknown): MorningMemory[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.map(parseMorningMemory).filter((memory): memory is MorningMemory => {
    if (!memory || seen.has(memory.id)) return false;
    seen.add(memory.id);
    return true;
  });
}

export function emptyMorningFoundationSession(): MorningFoundationSession {
  return { ...emptyMorningFoundation(), initialized: false, answer: "", memory: null,
    memoryReflection: "", sceneId: "", sceneTitle: "", action: "" };
}

export function parseMorningFoundationSession(value: unknown): MorningFoundationSession {
  const raw = record(value);
  return { ...parseMorningFoundation(raw), initialized: raw.initialized === true,
    answer: text(raw.answer), memory: parseMorningMemory(raw.memory), memoryReflection: text(raw.memoryReflection),
    sceneId: text(raw.sceneId), sceneTitle: text(raw.sceneTitle), action: text(raw.action),
    ...(raw.worshipPrayer ? { worshipPrayer: parseWorshipPrayerTimer(raw.worshipPrayer) } : {}),
    ...(raw.angelsPrayed === true ? { angelsPrayed: true } : {}) };
}

export function initializeMorningFoundationSession(settings: MorningFoundation, current: MorningFoundationSession): MorningFoundationSession {
  return current.initialized ? current : { ...current, ...settings, initialized: true };
}

/** Add only to a blank anchor; users can deliberately append later. */
export function carryMorningAction(existing: string, action: string): string {
  return existing.trim() ? existing : action.trim();
}

export function appendMorningAction(existing: string, action: string): string {
  const next = action.trim();
  if (!next || (`\n${existing.trim()}\n`).includes(`\n${next}\n`)) return existing;
  return [existing.trimEnd(), next].filter(Boolean).join("\n");
}

/** Field-level three-way merge. Concurrent changes to the same field need review. */
function mergeFields<T extends object>(base: T, desired: T, current: T): T {
  const next = { ...current };
  for (const key of Object.keys(desired) as Array<keyof T>) {
    if (desired[key] === base[key]) continue;
    if (current[key] !== base[key] && current[key] !== desired[key]) {
      throw new Error("Your morning foundation changed on another device. Your edits are still here. Reload and review the conflicting change before saving.");
    }
    next[key] = desired[key];
  }
  return next;
}

export function mergeMorningFoundation(base: MorningFoundation, desired: MorningFoundation, current: MorningFoundation): MorningFoundation {
  return mergeFields(base, desired, current);
}

export function mergeMorningMemories(base: MorningMemory[], desired: MorningMemory[], current: MorningMemory[]): MorningMemory[] {
  const before = new Map(base.map((memory) => [memory.id, memory]));
  const wanted = new Map(desired.map((memory) => [memory.id, memory]));
  const currentIds = new Set(current.map((memory) => memory.id));
  const merged: MorningMemory[] = [];
  for (const memory of current) {
    const old = before.get(memory.id);
    const edit = wanted.get(memory.id);
    if (old && !edit) {
      if (JSON.stringify(old) !== JSON.stringify(memory)) throw new Error("This memory changed on another device. Reload before removing it.");
      continue;
    }
    if (!old && edit && JSON.stringify(edit) !== JSON.stringify(memory)) throw new Error("A memory with this ID already exists. Reload before saving.");
    merged.push(old && edit ? mergeFields(old, edit, memory) : memory);
  }
  for (const memory of desired) {
    if (currentIds.has(memory.id)) continue;
    if (before.has(memory.id)) {
      if (JSON.stringify(before.get(memory.id)) !== JSON.stringify(memory)) throw new Error("This memory was removed on another device. Reload before saving your edit.");
      continue;
    }
    merged.push(memory);
  }
  return merged;
}

export function formatMorningFoundationJournal(value: unknown): string {
  const day = parseMorningFoundationSession(value);
  const blocks: string[] = [];
  if (day.theme.trim()) blocks.push(`**This season:** ${day.theme}`);
  if (day.motto.trim()) blocks.push(`**My motto:** ${day.motto}`);
  if (day.question.trim()) blocks.push(`**Today's question:** ${day.question}`);
  if (day.answer.trim()) blocks.push(`**My reflection:** ${day.answer}`);
  if (day.memory) {
    blocks.push(`### Remember — a real memory I selected\n\n${day.memory.title}${day.memory.happenedOn ? ` (${day.memory.happenedOn})` : ""}\n\n${day.memory.body}`);
  }
  if (day.memoryReflection.trim()) blocks.push(`**What I remember and appreciate:** ${day.memoryReflection}`);
  if (day.sceneTitle.trim()) blocks.push(`### Imagine — a future scene, not a past event\n\n${day.sceneTitle}`);
  if (day.action.trim()) blocks.push(`### Act — my chosen next step\n\n${day.action}`);
  if (day.hopePrayer.trim()) blocks.push(`### My gratitude and hope prayer\n\n${day.hopePrayer}\n\nPersonal prayer, not Scripture.`);
  if (day.worshipPrayer?.hasStarted) {
    const remaining = worshipPrayerRemaining(day.worshipPrayer);
    const seconds = Math.floor(Math.max(0, day.worshipPrayer.targetMs - remaining) / 1000);
    blocks.push(`**Prayer-in-tongues timer:** ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} elapsed. Timer only, not a verification of prayer.`);
  }
  if (day.worshipPrayer?.prayedToday) blocks.push("**My check-in:** I prayed in the Spirit today.");
  if (day.angelPrayer?.trim()) blocks.push(`### Angels and protection — my personal prayer\n\n${day.angelPrayer}`);
  if (day.angelsPrayed) blocks.push("**My check-in:** I spoke my angels and protection prayer aloud today.");
  return blocks.join("\n\n");
}
