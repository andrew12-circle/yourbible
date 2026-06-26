/**
 * Device-local fallback when `life_week_reviews` is not migrated yet.
 */

import type { LifeWeekReviewRow, LifeWeekReviewSubject } from "@/lib/lifeWeekReview";
import { emptyClosedWeekIndicesBySubject } from "@/lib/lifeWeekReview";

const STORAGE_KEY = "yb_life_week_reviews_local_v1";
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
