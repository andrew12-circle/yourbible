/**
 * Device-local fallback when `life_week_reviews` is not migrated yet.
 */

import type { LifeWeekReviewRow, LifeWeekReviewSubject } from "@/lib/lifeWeekReview";
import { emptyClosedWeekIndicesBySubject } from "@/lib/lifeWeekReview";

const STORAGE_KEY = "yb_life_week_reviews_local_v1";
const DISMISS_KEY = "yb_life_week_review_dismissed_v1";
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

function writeDismissedAll(data: Record<string, string[]>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
}

export function localListDismissedLifeWeekReviewKeys(userId: string): Set<string> {
  return new Set(readDismissedAll()[userId] ?? []);
}

export function localDismissLifeWeekReview(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): void {
  const key = lifeWeekReviewDismissKey(subject, weekIndex);
  const all = readDismissedAll();
  const keys = new Set(all[userId] ?? []);
  keys.add(key);
  all[userId] = [...keys];
  writeDismissedAll(all);
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
