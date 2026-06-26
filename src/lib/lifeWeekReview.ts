import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  computeLifeWeekIndex,
  formatLifeWeekRange,
  lifeWeekMondayIso,
} from "@/lib/lifeWeeks";
import type { FamilyMemberId } from "@/lib/lifeWeeksFamily";
import {
  localListAllLifeWeekReviews,
  localListClosedLifeWeekIndicesBySubject,
  localSaveLifeWeekReview,
  notifyLifeWeekReviewLocalModeOnce,
} from "@/lib/lifeWeekReviewLocalStore";
import {
  mergeLifeWeekReviewLogEntries,
  type LifeWeekReviewLogEntry,
} from "@/lib/lifeWeekReviewLog";
import { isPostgrestError, isSupabaseMissingTable } from "@/lib/supabase/errors";

export type LifeWeekReviewRow = Tables<"life_week_reviews">;

export type LifeWeekReviewSubject = "self" | FamilyMemberId;

export type LifeWeekChartKind = "life-weeks" | "blink";

export const LIFE_WEEK_REVIEW_SUBJECTS: LifeWeekReviewSubject[] = ["self", "lilly", "caroline"];

export const LIFE_WEEK_REFLECTION_MIN = 20;

export const LIFE_WEEK_REFLECTION_PROMPT =
  "What did you do this past week to live the life you want—or the life God has called you to live?";

export function lifeWeekReflectionPrompt(subject: LifeWeekReviewSubject, personName: string): string {
  if (subject === "self") return LIFE_WEEK_REFLECTION_PROMPT;
  return `What stood out about ${personName}'s past week—joys, struggles, or moments you want to remember while they're still home?`;
}

export function lifeWeekReviewChartKind(subject: LifeWeekReviewSubject): LifeWeekChartKind {
  return subject === "self" ? "life-weeks" : "blink";
}

export function emptyClosedWeekIndicesBySubject(): Record<LifeWeekReviewSubject, Set<number>> {
  return {
    self: new Set(),
    lilly: new Set(),
    caroline: new Set(),
  };
}

function normalizeSubject(raw: string | null | undefined): LifeWeekReviewSubject {
  if (raw === "lilly" || raw === "caroline") return raw;
  return "self";
}

function isMissingSubjectColumn(error: PostgrestError): boolean {
  return /subject/i.test(error.message) && isSupabaseMissingTable(error);
}

function isRemoteSchemaMismatch(error: PostgrestError): boolean {
  if (isSupabaseMissingTable(error)) return true;
  if (isMissingSubjectColumn(error)) return true;
  return (
    error.code === "42P10" ||
    /on conflict/i.test(error.message) ||
    /there is no unique.*constraint/i.test(error.message)
  );
}

function warnRemoteLifeWeekReviewFailure(action: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`life week review ${action} failed; using local copy`, error);
  }
}

export function priorLifeWeekIndex(currentWeekIndex: number): number {
  return currentWeekIndex - 1;
}

/** Life week that must be closed before the current week (immediate prior Monday week). */
export function pendingLifeWeekIndex(
  currentWeekIndex: number,
  closedWeekIndices: ReadonlySet<number>,
): number | null {
  const prior = priorLifeWeekIndex(currentWeekIndex);
  if (prior < 0 || closedWeekIndices.has(prior)) return null;
  return prior;
}

export function needsPriorLifeWeekReview(
  currentWeekIndex: number,
  closedWeekIndices: ReadonlySet<number>,
): boolean {
  return pendingLifeWeekIndex(currentWeekIndex, closedWeekIndices) !== null;
}

export type PendingLifeWeekReview = {
  subject: LifeWeekReviewSubject;
  personName: string;
  chartKind: LifeWeekChartKind;
  weekIndex: number;
  weekNumber: number;
  weekRangeLabel: string;
  weekStart: string;
};

export function buildPendingLifeWeekReview(
  birthIso: string,
  weekIndex: number,
  subject: LifeWeekReviewSubject,
  personName: string,
): PendingLifeWeekReview | null {
  if (weekIndex < 0) return null;
  const weekStart = lifeWeekMondayIso(birthIso, weekIndex);
  if (!weekStart) return null;
  return {
    subject,
    personName,
    chartKind: lifeWeekReviewChartKind(subject),
    weekIndex,
    weekNumber: weekIndex + 1,
    weekRangeLabel: formatLifeWeekRange(birthIso, weekIndex),
    weekStart,
  };
}

function mergeClosedBySubject(
  remote: Record<LifeWeekReviewSubject, Set<number>>,
  local: Record<LifeWeekReviewSubject, Set<number>>,
): Record<LifeWeekReviewSubject, Set<number>> {
  const merged = emptyClosedWeekIndicesBySubject();
  for (const subject of LIFE_WEEK_REVIEW_SUBJECTS) {
    merged[subject] = new Set([...remote[subject], ...local[subject]]);
  }
  return merged;
}

async function fetchRemoteClosedBySubject(
  userId: string,
): Promise<Record<LifeWeekReviewSubject, Set<number>> | null> {
  const withSubject = await supabase
    .from("life_week_reviews")
    .select("week_index, subject")
    .eq("user_id", userId);

  if (!withSubject.error) {
    const remote = emptyClosedWeekIndicesBySubject();
    for (const row of withSubject.data ?? []) {
      remote[normalizeSubject(row.subject)].add(row.week_index);
    }
    return remote;
  }

  if (!isRemoteSchemaMismatch(withSubject.error)) {
    throw withSubject.error;
  }

  const legacy = await supabase.from("life_week_reviews").select("week_index").eq("user_id", userId);
  if (legacy.error) {
    if (isSupabaseMissingTable(legacy.error)) return null;
    throw legacy.error;
  }

  const remote = emptyClosedWeekIndicesBySubject();
  for (const row of legacy.data ?? []) {
    remote.self.add(row.week_index);
  }
  return remote;
}

function rowToLogEntry(row: LifeWeekReviewRow, source: "remote" | "local"): LifeWeekReviewLogEntry {
  return {
    id: row.id,
    subject: normalizeSubject(row.subject),
    week_index: row.week_index,
    week_start: row.week_start,
    reflection: row.reflection,
    completed_at: row.completed_at,
    source,
  };
}

async function fetchRemoteLifeWeekReviewLog(userId: string): Promise<LifeWeekReviewLogEntry[] | null> {
  const withSubject = await supabase
    .from("life_week_reviews")
    .select("id, week_index, week_start, reflection, completed_at, subject")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (!withSubject.error) {
    return (withSubject.data ?? []).map((row) =>
      rowToLogEntry(row as LifeWeekReviewRow, "remote"),
    );
  }

  if (!isRemoteSchemaMismatch(withSubject.error)) {
    throw withSubject.error;
  }

  const legacy = await supabase
    .from("life_week_reviews")
    .select("id, week_index, week_start, reflection, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (legacy.error) {
    if (isSupabaseMissingTable(legacy.error)) return null;
    throw legacy.error;
  }

  return (legacy.data ?? []).map((row) =>
    rowToLogEntry({ ...row, subject: "self" } as LifeWeekReviewRow, "remote"),
  );
}

/** All closed week reflections — remote merged with local fallback. */
export async function listAllLifeWeekReviews(userId: string): Promise<LifeWeekReviewLogEntry[]> {
  const local = localListAllLifeWeekReviews(userId).map((row) => rowToLogEntry(row, "local"));

  try {
    const remote = await fetchRemoteLifeWeekReviewLog(userId);
    if (remote) return mergeLifeWeekReviewLogEntries(remote, local);
  } catch (e) {
    if (!isSupabaseMissingTable(e)) {
      warnRemoteLifeWeekReviewFailure("log load", e);
    }
  }

  return mergeLifeWeekReviewLogEntries([], local);
}

export async function listClosedLifeWeekIndicesBySubject(
  userId: string,
): Promise<Record<LifeWeekReviewSubject, Set<number>>> {
  const local = localListClosedLifeWeekIndicesBySubject(userId);

  try {
    const remote = await fetchRemoteClosedBySubject(userId);
    if (remote) return mergeClosedBySubject(remote, local);
  } catch (e) {
    if (isSupabaseMissingTable(e)) {
      notifyLifeWeekReviewLocalModeOnce();
    } else {
      warnRemoteLifeWeekReviewFailure("load", e);
    }
  }

  return local;
}

/** @deprecated Use listClosedLifeWeekIndicesBySubject */
export async function listClosedLifeWeekIndices(userId: string): Promise<Set<number>> {
  const bySubject = await listClosedLifeWeekIndicesBySubject(userId);
  return bySubject.self;
}

async function upsertRemoteLifeWeekReview(
  row: TablesInsert<"life_week_reviews">,
): Promise<LifeWeekReviewRow | null> {
  const withSubject = await supabase
    .from("life_week_reviews")
    .upsert(row, { onConflict: "user_id,subject,week_index" })
    .select("*")
    .single();

  if (!withSubject.error && withSubject.data) return withSubject.data;
  if (withSubject.error && !isRemoteSchemaMismatch(withSubject.error)) {
    throw withSubject.error;
  }

  if (row.subject !== "self") return null;

  const legacyRow = {
    user_id: row.user_id,
    week_index: row.week_index,
    week_start: row.week_start,
    reflection: row.reflection,
  };
  const legacy = await supabase
    .from("life_week_reviews")
    .upsert(legacyRow, { onConflict: "user_id,week_index" })
    .select("*")
    .single();

  if (legacy.error) {
    if (isSupabaseMissingTable(legacy.error)) return null;
    throw legacy.error;
  }

  return legacy.data ? { ...legacy.data, subject: "self" } : null;
}

export async function saveLifeWeekReview(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
  weekStart: string,
  reflection: string,
): Promise<LifeWeekReviewRow> {
  const trimmed = reflection.trim();
  if (trimmed.length < LIFE_WEEK_REFLECTION_MIN) {
    throw new Error(`Write at least ${LIFE_WEEK_REFLECTION_MIN} characters.`);
  }

  const localRow = localSaveLifeWeekReview(userId, subject, weekIndex, weekStart, trimmed);

  const row: TablesInsert<"life_week_reviews"> = {
    user_id: userId,
    subject,
    week_index: weekIndex,
    week_start: weekStart,
    reflection: trimmed,
  };

  try {
    const remoteRow = await upsertRemoteLifeWeekReview(row);
    if (remoteRow) return remoteRow;
    notifyLifeWeekReviewLocalModeOnce();
    return localRow;
  } catch (e) {
    if (isPostgrestError(e) && !isSupabaseMissingTable(e)) {
      warnRemoteLifeWeekReviewFailure("save", e);
    }
    notifyLifeWeekReviewLocalModeOnce();
    return localRow;
  }
}

export function resolvePendingLifeWeekReview(
  birthIso: string | null | undefined,
  closedWeekIndices: ReadonlySet<number>,
  subject: LifeWeekReviewSubject,
  personName: string,
  nowMs: number = Date.now(),
): PendingLifeWeekReview | null {
  if (!birthIso?.trim()) return null;
  const indexState = computeLifeWeekIndex(birthIso, nowMs);
  if (!indexState) return null;
  const pendingIndex = pendingLifeWeekIndex(indexState.currentWeekIndex, closedWeekIndices);
  if (pendingIndex === null) return null;
  return buildPendingLifeWeekReview(birthIso, pendingIndex, subject, personName);
}

export type LifeWeekReviewPerson = {
  subject: LifeWeekReviewSubject;
  birthIso: string;
  personName: string;
};

export function resolvePendingLifeWeekReviews(
  people: LifeWeekReviewPerson[],
  closedBySubject: Record<LifeWeekReviewSubject, Set<number>>,
  nowMs: number = Date.now(),
): PendingLifeWeekReview[] {
  const pending: PendingLifeWeekReview[] = [];
  for (const person of people) {
    const review = resolvePendingLifeWeekReview(
      person.birthIso,
      closedBySubject[person.subject],
      person.subject,
      person.personName,
      nowMs,
    );
    if (review) pending.push(review);
  }
  return pending;
}
