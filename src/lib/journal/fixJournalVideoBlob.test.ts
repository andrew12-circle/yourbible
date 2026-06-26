import { describe, expect, it } from "vitest";
import { journalVideoDurationNeedsFix } from "@/lib/journal/fixJournalVideoBlob";

describe("journalVideoDurationNeedsFix", () => {
  it("returns false for mp4 even when duration is short", () => {
    expect(journalVideoDurationNeedsFix({ duration: 3 }, 120_000, "video/mp4")).toBe(false);
  });

  it("returns true when webm duration is much shorter than recorded length", () => {
    expect(journalVideoDurationNeedsFix({ duration: 8 }, 120_000, "video/webm")).toBe(true);
  });

  it("returns false when webm duration matches recorded length", () => {
    expect(journalVideoDurationNeedsFix({ duration: 120 }, 120_000, "video/webm")).toBe(false);
  });

  it("returns true for non-finite browser duration", () => {
    expect(journalVideoDurationNeedsFix({ duration: Infinity }, 30_000, "video/webm")).toBe(true);
    expect(journalVideoDurationNeedsFix({ duration: NaN }, 30_000, "video/webm")).toBe(true);
  });
});
