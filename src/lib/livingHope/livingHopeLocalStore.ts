/**
 * Device-local fallback when `living_hope_*` tables are not migrated yet.
 * Data syncs to Supabase automatically once tables exist.
 */

import { defaultLetterTitle } from "@/lib/livingHope/letterSections";
import { emptyWorkbook, mergeWorkbook, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import { localDateISO } from "@/lib/lifePriorities";
import type {
  GoalTouch,
  LivingHopeGoalRow,
  LivingHopeLetterRow,
  LivingHopeReviewRow,
  MorningReviewPayload,
} from "@/lib/livingHope/api";
import type { TablesUpdate } from "@/integrations/supabase/types";

const STORAGE_KEY = "yb_living_hope_local_v1";
const NOTIFY_KEY = "yb_living_hope_local_notified";

interface WeeklyLocal {
  week_start: string;
  answers: string[];
  completed_at: string;
}

interface LocalBundle {
  workbook: LivingHopeWorkbookContent;
  letter: LivingHopeLetterRow;
  goals: LivingHopeGoalRow[];
  reviews: LivingHopeReviewRow[];
  weekly: WeeklyLocal[];
}

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function readAll(): Record<string, LocalBundle> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LocalBundle>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, LocalBundle>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function bundleFor(userId: string): LocalBundle {
  const all = readAll();
  if (all[userId]) return all[userId];
  const letter: LivingHopeLetterRow = {
    id: newId(),
    user_id: userId,
    title: defaultLetterTitle(2),
    timeframe_years: 2,
    status: "draft",
    mission_statement: null,
    gratitude: null,
    realizations: null,
    outlook: null,
    wishes: null,
    scripture_anchor: null,
    surrender_prayer: null,
    full_letter: null,
    sealed_at: null,
    unlock_at: null,
    opened_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const bundle: LocalBundle = {
    workbook: emptyWorkbook(),
    letter,
    goals: [],
    reviews: [],
    weekly: [],
  };
  all[userId] = bundle;
  writeAll(all);
  return bundle;
}

function saveBundle(userId: string, bundle: LocalBundle): void {
  const all = readAll();
  all[userId] = bundle;
  writeAll(all);
}

export function notifyLocalModeOnce(): void {
  if (typeof window === "undefined" || sessionStorage.getItem(NOTIFY_KEY)) return;
  sessionStorage.setItem(NOTIFY_KEY, "1");
}

export function isLocalModeNotified(): boolean {
  return typeof window !== "undefined" && !!sessionStorage.getItem(NOTIFY_KEY);
}

export function localGetWorkbook(userId: string): LivingHopeWorkbookContent {
  return mergeWorkbook(bundleFor(userId).workbook);
}

export function localSaveWorkbook(userId: string, content: LivingHopeWorkbookContent): void {
  const b = bundleFor(userId);
  b.workbook = content;
  saveBundle(userId, b);
}

export function localGetLetter(userId: string): LivingHopeLetterRow {
  return bundleFor(userId).letter;
}

export function localUpdateLetter(
  userId: string,
  patch: TablesUpdate<"living_hope_letters">,
): LivingHopeLetterRow {
  const b = bundleFor(userId);
  b.letter = { ...b.letter, ...patch, updated_at: nowIso() } as LivingHopeLetterRow;
  saveBundle(userId, b);
  return b.letter;
}

export function localUpdateLetterById(
  letterId: string,
  patch: TablesUpdate<"living_hope_letters">,
): LivingHopeLetterRow {
  const all = readAll();
  for (const [userId, bundle] of Object.entries(all)) {
    if (bundle.letter.id === letterId) return localUpdateLetter(userId, patch);
  }
  throw new Error("Letter not found");
}

export function localListGoals(userId: string, letterId?: string | null): LivingHopeGoalRow[] {
  const goals = bundleFor(userId).goals.filter((g) => !g.parent_goal_id);
  if (letterId) return goals.filter((g) => g.letter_id === letterId);
  return goals;
}

export function localCreateGoal(
  userId: string,
  input: {
    letter_id?: string | null;
    title: string;
    domain?: LivingHopeGoalRow["domain"];
    vivid_detail?: string;
    target_metric?: string;
    steps?: string[];
    scripture_refs?: string[];
    sort_order?: number;
  },
): LivingHopeGoalRow {
  const b = bundleFor(userId);
  const row: LivingHopeGoalRow = {
    id: newId(),
    user_id: userId,
    letter_id: input.letter_id ?? null,
    parent_goal_id: null,
    title: input.title,
    domain: input.domain ?? "others",
    vivid_detail: input.vivid_detail ?? null,
    target_metric: input.target_metric ?? null,
    steps: input.steps ?? [],
    scripture_refs: input.scripture_refs ?? [],
    status: "active",
    sort_order: input.sort_order ?? b.goals.length,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  b.goals.push(row);
  saveBundle(userId, b);
  return row;
}

export function localUpdateGoal(
  userId: string,
  id: string,
  patch: TablesUpdate<"living_hope_goals">,
): LivingHopeGoalRow {
  const b = bundleFor(userId);
  const i = b.goals.findIndex((g) => g.id === id);
  if (i < 0) throw new Error("Goal not found");
  b.goals[i] = { ...b.goals[i], ...patch, updated_at: nowIso() } as LivingHopeGoalRow;
  saveBundle(userId, b);
  return b.goals[i];
}

export function localDeleteGoal(userId: string, id: string): void {
  const b = bundleFor(userId);
  b.goals = b.goals.filter((g) => g.id !== id);
  saveBundle(userId, b);
}

export function localUpdateGoalById(
  goalId: string,
  patch: TablesUpdate<"living_hope_goals">,
): LivingHopeGoalRow {
  const all = readAll();
  for (const [userId, bundle] of Object.entries(all)) {
    const i = bundle.goals.findIndex((g) => g.id === goalId);
    if (i >= 0) return localUpdateGoal(userId, goalId, patch);
  }
  throw new Error("Goal not found");
}

export function localDeleteGoalById(goalId: string): void {
  const all = readAll();
  for (const [userId, bundle] of Object.entries(all)) {
    if (bundle.goals.some((g) => g.id === goalId)) {
      localDeleteGoal(userId, goalId);
      return;
    }
  }
}

export function localGetTodayReview(userId: string): LivingHopeReviewRow | null {
  const today = localDateISO();
  return bundleFor(userId).reviews.find((r) => r.review_date === today) ?? null;
}

export function localSaveMorningReview(
  userId: string,
  input: MorningReviewPayload,
): LivingHopeReviewRow {
  const today = localDateISO();
  const b = bundleFor(userId);
  const row: LivingHopeReviewRow = {
    id: newId(),
    user_id: userId,
    review_date: today,
    surrender_note: input.surrender_note,
    goal_touches: input.goal_touches,
    vision_recall: input.vision_recall ?? null,
    story_index: input.story_index ?? null,
    manifesto_index: input.manifesto_index ?? null,
    routine_checks: input.routine_checks ?? {},
    metric_values: input.metric_values ?? {},
    connection_notes: (input.connection_notes ?? {}) as LivingHopeReviewRow["connection_notes"],
    completed_at: nowIso(),
    created_at: nowIso(),
  };
  const idx = b.reviews.findIndex((r) => r.review_date === today);
  if (idx >= 0) b.reviews[idx] = row;
  else b.reviews.unshift(row);
  saveBundle(userId, b);
  return row;
}

export function localCountReviewStreak(userId: string): number {
  const dates = bundleFor(userId)
    .reviews.map((r) => r.review_date)
    .sort()
    .reverse();
  if (!dates.length) return 0;
  let streak = 0;
  let cursor = localDateISO();
  if (dates[0] !== cursor) {
    const [y, m, d] = cursor.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    const yesterday = localDateISO(dt);
    if (dates[0] !== yesterday) return 0;
    cursor = yesterday;
  }
  for (const date of dates) {
    if (date === cursor) {
      streak++;
      const [y, m, day] = cursor.split("-").map(Number);
      const dt = new Date(y, m - 1, day);
      dt.setDate(dt.getDate() - 1);
      cursor = localDateISO(dt);
    } else if (date < cursor) break;
  }
  return streak;
}

export function localGetWeeklyReview(userId: string, weekStart: string): WeeklyLocal | null {
  return bundleFor(userId).weekly.find((w) => w.week_start === weekStart) ?? null;
}

export function localSaveWeeklyReview(userId: string, weekStart: string, answers: string[]): WeeklyLocal {
  const b = bundleFor(userId);
  const row: WeeklyLocal = { week_start: weekStart, answers, completed_at: nowIso() };
  const idx = b.weekly.findIndex((w) => w.week_start === weekStart);
  if (idx >= 0) b.weekly[idx] = row;
  else b.weekly.unshift(row);
  saveBundle(userId, b);
  return row;
}
