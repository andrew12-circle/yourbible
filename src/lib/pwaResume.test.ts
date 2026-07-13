import { beforeEach, describe, expect, it } from "vitest";
import {
  buildPwaResumeUrl,
  createPwaResumeSnapshot,
  isPwaResumeLaunchUrl,
  isStandalonePwa,
  PWA_RESUME_MAX_AGE_MS,
  PWA_RESUME_STORAGE_KEY,
  readPwaResumeSnapshot,
  savePwaResumeSnapshot,
  shouldStorePwaResumeUrl,
} from "@/lib/pwaResume";

describe("pwaResume", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds and recognizes the fresh PWA launch URL", () => {
    expect(buildPwaResumeUrl("/journal/e/entry-1", "?tab=chat", "#reply")).toBe(
      "/journal/e/entry-1?tab=chat#reply",
    );
    expect(isPwaResumeLaunchUrl("/", "", "")).toBe(true);
    expect(isPwaResumeLaunchUrl("/", "?next=/home", "")).toBe(false);
    expect(isPwaResumeLaunchUrl("/home", "", "")).toBe(false);
  });

  it("stores same-origin app routes and blocks startup or auth routes", () => {
    expect(shouldStorePwaResumeUrl("/journal/e/entry-1?tab=chat#reply")).toBe(true);
    expect(shouldStorePwaResumeUrl("/read/Jhn/3")).toBe(true);
    expect(shouldStorePwaResumeUrl("/")).toBe(false);
    expect(shouldStorePwaResumeUrl("/auth")).toBe(false);
    expect(shouldStorePwaResumeUrl("/auth/reset")).toBe(false);
    expect(shouldStorePwaResumeUrl("/onboarding")).toBe(false);
    expect(shouldStorePwaResumeUrl("https://example.com/home")).toBe(false);
    expect(shouldStorePwaResumeUrl("//example.com/home")).toBe(false);
  });

  it("rounds scroll positions while saving and reading a valid snapshot", () => {
    const snapshot = createPwaResumeSnapshot("/framework/artifacts/abc", 4.2, 99.8, 1_000);

    expect(savePwaResumeSnapshot(localStorage, snapshot)).toBe(true);
    expect(readPwaResumeSnapshot(localStorage, 2_000)).toEqual({
      url: "/framework/artifacts/abc",
      scrollX: 4,
      scrollY: 100,
      savedAt: 1_000,
    });
  });

  it("clears stale or unsafe snapshots", () => {
    savePwaResumeSnapshot(
      localStorage,
      createPwaResumeSnapshot("/home", 0, 0, 1_000),
    );
    expect(readPwaResumeSnapshot(localStorage, 1_000 + PWA_RESUME_MAX_AGE_MS + 1)).toBeNull();
    expect(localStorage.getItem(PWA_RESUME_STORAGE_KEY)).toBeNull();

    localStorage.setItem(
      PWA_RESUME_STORAGE_KEY,
      JSON.stringify({ url: "/auth", scrollX: 0, scrollY: 0, savedAt: 1_000 }),
    );
    expect(readPwaResumeSnapshot(localStorage, 2_000)).toBeNull();
    expect(localStorage.getItem(PWA_RESUME_STORAGE_KEY)).toBeNull();
  });

  it("detects standalone display mode and iOS standalone installs", () => {
    expect(
      isStandalonePwa({
        navigator: {} as Navigator,
        matchMedia: () => ({ matches: true }) as MediaQueryList,
      }),
    ).toBe(true);
    expect(
      isStandalonePwa({
        navigator: { standalone: true } as Navigator & { standalone: boolean },
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      }),
    ).toBe(true);
    expect(
      isStandalonePwa({
        navigator: {} as Navigator,
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      }),
    ).toBe(false);
  });
});
