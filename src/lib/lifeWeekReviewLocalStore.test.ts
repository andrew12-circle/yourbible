import { beforeEach, describe, expect, it } from "vitest";
import {
  lifeWeekReviewDismissKey,
  localDismissLifeWeekReview,
  localListClosedLifeWeekIndicesBySubject,
  localListDismissedLifeWeekReviewKeys,
  localSaveLifeWeekReview,
} from "@/lib/lifeWeekReviewLocalStore";

const STORAGE_KEY = "yb_life_week_reviews_local_v1";
const USER = "user-test-123";

describe("lifeWeekReviewLocalStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists closed weeks per subject across reads", () => {
    localSaveLifeWeekReview(USER, "self", 2026, "2026-06-16", "Reflection for my week.");
    localSaveLifeWeekReview(USER, "lilly", 216, "2026-06-16", "Reflection for Lilly's week.");

    const closed = localListClosedLifeWeekIndicesBySubject(USER);
    expect(closed.self.has(2026)).toBe(true);
    expect(closed.lilly.has(216)).toBe(true);
    expect(closed.caroline.size).toBe(0);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();

    const again = localListClosedLifeWeekIndicesBySubject(USER);
    expect(again.self.has(2026)).toBe(true);
    expect(again.lilly.has(216)).toBe(true);
  });

  it("persists dismissed week review keys per user", () => {
    expect(lifeWeekReviewDismissKey("lilly", 216)).toBe("lilly:216");
    localDismissLifeWeekReview(USER, "lilly", 216);
    expect(localListDismissedLifeWeekReviewKeys(USER).has("lilly:216")).toBe(true);
    expect(localListDismissedLifeWeekReviewKeys("other-user").size).toBe(0);
  });
});
