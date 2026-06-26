/**
 * Device-local fallback when `life_week_reviews` is not migrated yet.
 */

import type { LifeWeekReviewRow } from "@/lib/lifeWeekReview";

const STORAGE_KEY = "yb_life_week_reviews_local_v1";
const NOTIFY_KEY = "yb_life_week_reviews_local_notified";

interface LocalReview {
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

export function localListClosedLifeWeekIndices(userId: string): Set<number> {
  return new Set(reviewsFor(userId).map((r) => r.week_index));
}

export function localSaveLifeWeekReview(
  userId: string,
  weekIndex: number,
  weekStart: string,
  reflection: string,
): LifeWeekReviewRow {
  const reviews = reviewsFor(userId);
  const completed_at = nowIso();
  const local: LocalReview = {
    week_index: weekIndex,
    week_start: weekStart,
    reflection,
    completed_at,
  };
  const idx = reviews.findIndex((r) => r.week_index === weekIndex);
  if (idx >= 0) reviews[idx] = local;
  else reviews.push(local);
  saveReviews(userId, reviews);

  return {
    id: newId(),
    user_id: userId,
    week_index: weekIndex,
    week_start: weekStart,
    reflection,
    completed_at,
    created_at: completed_at,
  };
}
