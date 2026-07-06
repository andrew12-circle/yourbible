/**
 * Device-local fallback when `life_week_reviews` is not migrated yet.
 */

import type { LifeWeekReviewRow, LifeWeekReviewSubject } from "@/lib/lifeWeekReview";
import { emptyClosedWeekIndicesBySubject, LIFE_WEEK_REVIEW_MAX_DISMISSALS } from "@/lib/lifeWeekReview";

const STORAGE_KEY = "yb_life_week_reviews_local_v1";
const DISMISS_KEY = "yb_life_week_review_dismissed_v1";
const DISMISS_COUNT_KEY = "yb_life_week_review_dismiss_counts_v1";
const NOTIFY_KEY = "yb_life_week_reviews_local_notified";

interface LocalReview {
  subject?: LifeWeekReviewSubject;
  week_index: number;
  week_start: string;
  reflection: string;
  completed_at: string;
}

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeSubject(raw: string | undefined): LifeWeekReviewSubject {
  if (raw === "lilly" || raw === "caroline") return raw;
  return "self";
}

function readAll(): Record<string, LocalReview[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LocalReview[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, LocalReview[]>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function reviewsFor(userId: string): LocalReview[] {
  return readAll()[userId] ?? [];
}

function saveReviews(userId: string, reviews: LocalReview[]): void {
  const all = readAll();
  all[userId] = reviews;
  writeAll(all);
}

export function notifyLifeWeekReviewLocalModeOnce(): void {
  if (typeof window === "undefined" || sessionStorage.getItem(NOTIFY_KEY)) return;
  sessionStorage.setItem(NOTIFY_KEY, "1");
}

export function isLifeWeekReviewLocalModeNotified(): boolean {
  return typeof window !== "undefined" && !!sessionStorage.getItem(NOTIFY_KEY);
}

export function localListClosedLifeWeekIndicesBySubject(
  userId: string,
): Record<LifeWeekReviewSubject, Set<number>> {
  const result = emptyClosedWeekIndicesBySubject();
  for (const review of reviewsFor(userId)) {
    result[normalizeSubject(review.subject)].add(review.week_index);
  }
  return result;
}

/** @deprecated Use localListClosedLifeWeekIndicesBySubject */
export function localListClosedLifeWeekIndices(userId: string): Set<number> {
  return localListClosedLifeWeekIndicesBySubject(userId).self;
}

export function localListAllLifeWeekReviews(userId: string): LifeWeekReviewRow[] {
  return reviewsFor(userId).map((review) => ({
    id: `${normalizeSubject(review.subject)}:${review.week_index}`,
    user_id: userId,
    subject: normalizeSubject(review.subject),
    week_index: review.week_index,
    week_start: review.week_start,
    reflection: review.reflection,
    completed_at: review.completed_at,
    created_at: review.completed_at,
  }));
}

export function lifeWeekReviewDismissKey(
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): string {
  return `${subject}:${weekIndex}`;
}

function readDismissCountsAll(): Record<string, Record<string, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DISMISS_COUNT_KEY);
    if (!raw) return migrateLegacyDismissedKeys();
    const parsed = JSON.parse(raw) as Record<string, Record<string, number>>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** One-time migration from permanent dismiss list (v1) to dismiss counts. */
function migrateLegacyDismissedKeys(): Record<string, Record<string, number>> {
  const legacy = readDismissedAll();
  const migrated: Record<string, Record<string, number>> = {};
  for (const [userId, keys] of Object.entries(legacy)) {
    migrated[userId] = {};
    for (const key of keys) {
      migrated[userId][key] = LIFE_WEEK_REVIEW_MAX_DISMISSALS;
    }
  }
  if (Object.keys(migrated).length > 0) {
    writeDismissCountsAll(migrated);
    if (typeof window !== "undefined") localStorage.removeItem(DISMISS_KEY);
  }
  return migrated;
}

function writeDismissCountsAll(data: Record<string, Record<string, number>>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_COUNT_KEY, JSON.stringify(data));
}

export function localGetLifeWeekReviewDismissCount(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): number {
  const key = lifeWeekReviewDismissKey(subject, weekIndex);
  return readDismissCountsAll()[userId]?.[key] ?? 0;
}

export function localListLifeWeekReviewDismissCounts(userId: string): Record<string, number> {
  return readDismissCountsAll()[userId] ?? {};
}

/** Increment dismiss count; returns the new count. At max, the review stops appearing. */
export function localIncrementLifeWeekReviewDismissCount(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): number {
  const key = lifeWeekReviewDismissKey(subject, weekIndex);
  const all = readDismissCountsAll();
  const counts = { ...(all[userId] ?? {}) };
  const next = Math.min(LIFE_WEEK_REVIEW_MAX_DISMISSALS, (counts[key] ?? 0) + 1);
  counts[key] = next;
  all[userId] = counts;
  writeDismissCountsAll(all);
  return next;
}

export function localIsLifeWeekReviewPermanentlyDismissed(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): boolean {
  return localGetLifeWeekReviewDismissCount(userId, subject, weekIndex) >= LIFE_WEEK_REVIEW_MAX_DISMISSALS;
}

function readDismissedAll(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @deprecated Use localListLifeWeekReviewDismissCounts + localIsLifeWeekReviewPermanentlyDismissed */
export function localListDismissedLifeWeekReviewKeys(userId: string): Set<string> {
  const counts = localListLifeWeekReviewDismissCounts(userId);
  return new Set(
    Object.entries(counts)
      .filter(([, count]) => count >= LIFE_WEEK_REVIEW_MAX_DISMISSALS)
      .map(([key]) => key),
  );
}

/** @deprecated Use localIncrementLifeWeekReviewDismissCount */
export function localDismissLifeWeekReview(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): void {
  const counts = readDismissCountsAll();
  const userCounts = { ...(counts[userId] ?? {}) };
  const key = lifeWeekReviewDismissKey(subject, weekIndex);
  userCounts[key] = LIFE_WEEK_REVIEW_MAX_DISMISSALS;
  counts[userId] = userCounts;
  writeDismissCountsAll(counts);
}

export function localSaveLifeWeekReview(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
  weekStart: string,
  reflection: string,
): LifeWeekReviewRow {
  const reviews = reviewsFor(userId);
  const completed_at = nowIso();
  const local: LocalReview = {
    subject,
    week_index: weekIndex,
    week_start: weekStart,
    reflection,
    completed_at,
  };
  const idx = reviews.findIndex(
    (r) => normalizeSubject(r.subject) === subject && r.week_index === weekIndex,
  );
  if (idx >= 0) reviews[idx] = local;
  else reviews.push(local);
  saveReviews(userId, reviews);

  return {
    id: newId(),
    user_id: userId,
    subject,
    week_index: weekIndex,
    week_start: weekStart,
    reflection,
    completed_at,
    created_at: completed_at,
  };
}
